import { Router, IRouter } from 'express';
import { prisma } from '@smashit/database';
import { createBookingSchema } from '@smashit/validators';
import { orgMiddleware } from '../middleware/org.middleware.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware.js';
import { bookingQueue, bookingQueueEvents } from '../lib/queue.js';
import { broadcastBookingUpdate } from '../services/sse.service.js';
import { bookingLimiter } from '../lib/core.js';

export const bookingRoutes: IRouter = Router({ mergeParams: true });

// Apply middleware
bookingRoutes.use(orgMiddleware);
bookingRoutes.use(authMiddleware);

// Get bookings for a space on a date
bookingRoutes.get('/', async (req: AuthRequest, res, next) => {
    try {
        const { spaceId, date, userId } = req.query;

        const where: any = {
            space: { orgId: req.org!.id },
            status: 'CONFIRMED',
        };

        if (spaceId) where.spaceId = spaceId;
        if (userId) where.userId = userId;
        if (date && typeof date === 'string') {
            const dayStart = new Date(`${date}T00:00:00.000Z`);
            const dayEnd = new Date(`${date}T23:59:59.999Z`);
            where.startTime = { gte: dayStart };
            where.endTime = { lte: dayEnd };
        }

        const bookings = await prisma.booking.findMany({
            where,
            include: {
                space: { select: { id: true, name: true } },
                user: { select: { id: true, name: true, avatarUrl: true, email: true } },
            },
            orderBy: { startTime: 'asc' },
        });

        res.json({ success: true, data: bookings });
    } catch (error) {
        next(error);
    }
});

// Get current user's bookings (all bookings - frontend handles past/future separation)
bookingRoutes.get('/my', async (req: AuthRequest, res, next) => {
    try {
        const bookings = await prisma.booking.findMany({
            where: {
                userId: req.user!.id,
                space: { orgId: req.org!.id },
                status: { in: ['PENDING', 'CONFIRMED'] },
            },
            include: {
                space: { select: { id: true, name: true } },
                slot: { select: { id: true, name: true, number: true } },
            },
            orderBy: { startTime: 'desc' },
        });

        res.json({ success: true, data: bookings });
    } catch (error) {
        next(error);
    }
});


// Create a booking (via queue) - rate limited
bookingRoutes.post('/', bookingLimiter, async (req: AuthRequest, res, next) => {
    try {
        const data = createBookingSchema.parse(req.body);

        // Verify space belongs to org
        const space = await prisma.space.findFirst({
            where: {
                id: data.spaceId,
                orgId: req.org!.id,
                isActive: true,
            },
            include: { rules: true },
        });

        if (!space) {
            return res.status(404).json({
                success: false,
                error: { code: 'SPACE_NOT_FOUND', message: 'Space not found' },
            });
        }

        // Add to queue for processing
        const job = await (bookingQueue as any).add('create-booking', {
            spaceId: data.spaceId,
            userId: req.user!.id,
            userName: req.user!.name,
            startTime: data.startTime,
            endTime: data.endTime,
            participants: data.participants || [],
            notes: data.notes,
            slotIndex: data.slotIndex,
            slotId: data.slotId, // Pass slotId
            orgId: req.org!.id,
        });

        // Wait for job to complete (with timeout)
        try {
            const result = await job.waitUntilFinished(bookingQueueEvents, 10000);
            res.status(201).json({ success: true, data: result });
        } catch (err: any) {
            const errorMessages: Record<string, { code: string; message: string; status: number }> = {
                'SLOT_ALREADY_BOOKED': { code: 'SLOT_TAKEN', message: 'This slot has already been booked', status: 409 },
                'BOOKING_TOO_FAR_AHEAD': { code: 'BOOKING_TOO_FAR_AHEAD', message: 'Cannot book this far in advance', status: 400 },
                'BOOKING_TOO_LONG': { code: 'BOOKING_TOO_LONG', message: 'Booking duration exceeds maximum allowed', status: 400 },
                'OUTSIDE_BOOKING_HOURS': { code: 'OUTSIDE_BOOKING_HOURS', message: 'Booking time is outside operating hours', status: 400 },
                'MAX_BOOKINGS_PER_USER_PER_DAY_EXCEEDED': { code: 'LIMIT_EXCEEDED', message: 'You have reached your daily booking limit for this space', status: 400 },
                'MAX_TOTAL_BOOKINGS_PER_DAY_EXCEEDED': { code: 'LIMIT_EXCEEDED', message: 'This space has reached its daily booking limit', status: 400 },
                'MAX_ACTIVE_BOOKINGS_EXCEEDED': { code: 'LIMIT_EXCEEDED', message: 'You have too many active bookings', status: 400 },
                'SPACE_NOT_FOUND': { code: 'SPACE_NOT_FOUND', message: 'Space not found', status: 404 },
            };

            const mappedError = errorMessages[err.message];
            if (mappedError) {
                return res.status(mappedError.status).json({
                    success: false,
                    error: { code: mappedError.code, message: mappedError.message },
                });
            }
            throw err;
        }
    } catch (error) {
        next(error);
    }
});

// Cancel a booking
bookingRoutes.delete('/:bookingId', async (req: AuthRequest, res, next) => {
    try {
        const bookingId = req.params.bookingId as string;

        const booking = await prisma.booking.findFirst({
            where: {
                id: bookingId,
                space: { orgId: req.org!.id },
            },
            include: {
                space: { select: { id: true, name: true } },
            },
        });

        if (!booking) {
            return res.status(404).json({
                success: false,
                error: { code: 'BOOKING_NOT_FOUND', message: 'Booking not found' },
            });
        }

        // Only allow cancellation by the booking owner or admin
        const isAdmin = req.membership?.role === 'ADMIN';
        if (booking.userId !== req.user!.id && !isAdmin) {
            return res.status(403).json({
                success: false,
                error: { code: 'FORBIDDEN', message: 'You can only cancel your own bookings' },
            });
        }

        await prisma.booking.update({
            where: { id: bookingId },
            data: { status: 'CANCELLED' },
        });

        // Broadcast cancellation
        broadcastBookingUpdate(req.org!.id, {
            type: 'BOOKING_CANCELLED',
            payload: {
                spaceId: booking.spaceId,
                date: booking.startTime.toISOString().split('T')[0],
                booking: {
                    id: booking.id,
                    startTime: booking.startTime.toISOString(),
                    endTime: booking.endTime.toISOString(),
                    userName: req.user!.name,
                },
            },
        });

        res.json({ success: true, data: { id: bookingId, status: 'CANCELLED' } });
    } catch (error) {
        next(error);
    }
});
