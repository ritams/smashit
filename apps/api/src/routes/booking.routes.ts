import { Router, IRouter } from 'express';
import { createBookingSchema } from '@avith/validators';
import { orgMiddleware } from '../middleware/org.middleware.js';
import { authMiddleware, ensureOrgAccess, AuthRequest } from '../middleware/auth.middleware.js';
import { bookingQueue, bookingQueueEvents } from '../lib/queue.js';
import { broadcastBookingUpdate } from '../services/sse.service.js';
import { bookingLimiter } from '../lib/core.js';
import * as BookingService from '../services/booking.service.js';

/**
 * Booking routes - all require authentication and org access
 */
export const bookingRoutes: IRouter = Router({ mergeParams: true });

// Apply middleware
bookingRoutes.use(orgMiddleware);
bookingRoutes.use(authMiddleware);
bookingRoutes.use(ensureOrgAccess);

// Get bookings for a space on a date
bookingRoutes.get('/', async (req: AuthRequest, res, next) => {
    try {
        const { spaceId, date, userId } = req.query;
        const bookings = await BookingService.getBookings({
            orgId: req.org!.id,
            spaceId: spaceId as string | undefined,
            userId: userId as string | undefined,
            date: date as string | undefined,
        });
        res.json({ success: true, data: bookings });
    } catch (error) {
        next(error);
    }
});

// Get current user's bookings
bookingRoutes.get('/my', async (req: AuthRequest, res, next) => {
    try {
        const bookings = await BookingService.getUserBookings({
            userId: req.user!.id,
            orgId: req.org!.id,
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
        const space = await BookingService.verifySpaceOwnership(data.spaceId, req.org!.id);
        if (!space) {
            return res.status(404).json({
                success: false,
                error: { code: 'SPACE_NOT_FOUND', message: 'Space not found' },
            });
        }

        const isAdmin = req.membership?.role === 'ADMIN';

        // Handle recurring bookings (Admin only)
        if (data.recurrence && data.recurrence !== 'NONE') {
            if (!isAdmin) {
                return res.status(403).json({
                    success: false,
                    error: { code: 'FORBIDDEN', message: 'Only admins can create recurring bookings' },
                });
            }

            const jobs = buildRecurringJobs(data, req.user!, req.org!.id, isAdmin);
            await (bookingQueue as any).addBulk(jobs.map(j => ({ name: 'create-booking', data: j.data })));
            return res.status(201).json({
                success: true,
                message: `Created ${jobs.length} recurring bookings`,
                recurrenceGroupId: jobs[0]?.data.recurrenceGroupId
            });
        }

        // Single booking
        const job = await (bookingQueue as any).add('create-booking', {
            spaceId: data.spaceId,
            userId: req.user!.id,
            userName: req.user!.name,
            startTime: data.startTime,
            endTime: data.endTime,
            participants: data.participants || [],
            notes: data.notes,
            slotIndex: data.slotIndex,
            slotId: data.slotId,
            orgId: req.org!.id,
            isAdmin,
        });

        try {
            const result = await job.waitUntilFinished(bookingQueueEvents, 10000);
            res.status(201).json({ success: true, data: result });
        } catch (err: any) {
            const errorResponse = mapBookingError(err.message);
            if (errorResponse) {
                return res.status(errorResponse.status).json({
                    success: false,
                    error: { code: errorResponse.code, message: errorResponse.message },
                });
            }
            throw err;
        }
    } catch (error) {
        next(error);
    }
});

// Cancel a booking
bookingRoutes.delete('/:bookingId', bookingLimiter, async (req: AuthRequest, res, next) => {
    try {
        const bookingId = req.params.bookingId as string;
        const booking = await BookingService.findBooking(bookingId, req.org!.id);

        if (!booking) {
            return res.status(404).json({
                success: false,
                error: { code: 'BOOKING_NOT_FOUND', message: 'Booking not found' },
            });
        }

        const isAdmin = req.membership?.role === 'ADMIN';
        if (booking.userId !== req.user!.id && !isAdmin) {
            return res.status(403).json({
                success: false,
                error: { code: 'FORBIDDEN', message: 'You can only cancel your own bookings' },
            });
        }

        await BookingService.cancelBooking(bookingId);

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

// --- Helper functions ---

function buildRecurringJobs(data: any, user: { id: string; name: string }, orgId: string, isAdmin: boolean) {
    const jobs: any[] = [];
    const recurrenceGroupId = crypto.randomUUID();
    let currentDate = new Date(data.startTime);
    const endDate = data.recurrenceEndDate ? new Date(data.recurrenceEndDate) : null;
    const count = data.recurrenceCount || 10;
    const durationMs = new Date(data.endTime).getTime() - new Date(data.startTime).getTime();

    for (let i = 0; i < count; i++) {
        if (endDate && currentDate > endDate) break;

        jobs.push({
            data: {
                spaceId: data.spaceId,
                userId: user.id,
                userName: user.name,
                startTime: currentDate.toISOString(),
                endTime: new Date(currentDate.getTime() + durationMs).toISOString(),
                participants: data.participants || [],
                notes: data.notes,
                slotIndex: data.slotIndex,
                slotId: data.slotId,
                orgId,
                isAdmin,
                recurrenceGroupId,
            }
        });

        if (data.recurrence === 'DAILY') currentDate.setDate(currentDate.getDate() + 1);
        else if (data.recurrence === 'WEEKLY') currentDate.setDate(currentDate.getDate() + 7);
    }

    return jobs;
}

const BOOKING_ERROR_MAP: Record<string, { code: string; message: string; status: number }> = {
    'SLOT_ALREADY_BOOKED': { code: 'SLOT_TAKEN', message: 'This slot has already been booked', status: 409 },
    'BOOKING_TOO_FAR_AHEAD': { code: 'BOOKING_TOO_FAR_AHEAD', message: 'Cannot book this far in advance', status: 400 },
    'BOOKING_TOO_LONG': { code: 'BOOKING_TOO_LONG', message: 'Booking duration exceeds maximum allowed', status: 400 },
    'OUTSIDE_BOOKING_HOURS': { code: 'OUTSIDE_BOOKING_HOURS', message: 'Booking time is outside operating hours', status: 400 },
    'MAX_BOOKINGS_PER_USER_PER_DAY_EXCEEDED': { code: 'LIMIT_EXCEEDED', message: 'You have reached your daily booking limit for this space', status: 400 },
    'MAX_TOTAL_BOOKINGS_PER_DAY_EXCEEDED': { code: 'LIMIT_EXCEEDED', message: 'This space has reached its daily booking limit', status: 400 },
    'MAX_ACTIVE_BOOKINGS_EXCEEDED': { code: 'LIMIT_EXCEEDED', message: 'You have too many active bookings', status: 400 },
    'USER_ALREADY_BOOKED_AT_THIS_TIME': { code: 'OVERLAP', message: 'You already have another booking during this time', status: 409 },
    'SPACE_NOT_FOUND': { code: 'SPACE_NOT_FOUND', message: 'Space not found', status: 404 },
};

function mapBookingError(message: string) {
    if (message.startsWith('USER_ALREADY_BOOKED_AT_THIS_TIME')) {
        const [_, spaceName] = message.split('|');
        return {
            code: 'OVERLAP',
            message: spaceName
                ? `You already have a booking in "${spaceName}" during this time`
                : 'You already have another booking during this time',
            status: 409
        };
    }
    return BOOKING_ERROR_MAP[message];
}
