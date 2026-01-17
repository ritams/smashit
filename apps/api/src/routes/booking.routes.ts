import { Router } from 'express';
import { prisma } from '@smashit/database';
import { createBookingSchema } from '@smashit/validators';
import { orgMiddleware } from '../middleware/org.middleware.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware.js';
import { bookingQueue } from '../lib/queue.js';
import { broadcastBookingUpdate } from '../services/sse.service.js';

export const bookingRoutes = Router({ mergeParams: true });

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
                user: { select: { id: true, name: true, avatarUrl: true } },
            },
            orderBy: { startTime: 'asc' },
        });

        res.json({ success: true, data: bookings });
    } catch (error) {
        next(error);
    }
});

// Get current user's bookings
bookingRoutes.get('/my', async (req: AuthRequest, res, next) => {
    try {
        const bookings = await prisma.booking.findMany({
            where: {
                userId: req.user!.id,
                status: { in: ['PENDING', 'CONFIRMED'] },
                endTime: { gte: new Date() },
            },
            include: {
                space: { select: { id: true, name: true } },
            },
            orderBy: { startTime: 'asc' },
        });

        res.json({ success: true, data: bookings });
    } catch (error) {
        next(error);
    }
});

// Create a booking (via queue)
bookingRoutes.post('/', async (req: AuthRequest, res, next) => {
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
        const job = await bookingQueue.add('create-booking', {
            spaceId: data.spaceId,
            userId: req.user!.id,
            userName: req.user!.name,
            startTime: data.startTime,
            endTime: data.endTime,
            participants: data.participants || [],
            notes: data.notes,
            orgId: req.org!.id,
        });

        // Wait for job to complete (with timeout)
        try {
            const result = await job.waitUntilFinished(bookingQueue.events, 10000);
            res.status(201).json({ success: true, data: result });
        } catch (err: any) {
            if (err.message === 'SLOT_ALREADY_BOOKED') {
                return res.status(409).json({
                    success: false,
                    error: { code: 'SLOT_TAKEN', message: 'This slot has already been booked' },
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
        const { bookingId } = req.params;

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
        if (booking.userId !== req.user!.id && req.user!.role !== 'ADMIN') {
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
