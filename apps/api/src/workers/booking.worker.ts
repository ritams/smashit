import { Worker, Job } from 'bullmq';
import { prisma } from '@smashit/database';
import { redis } from '../lib/redis.js';
import { BookingJobData } from '../lib/queue.js';
import { startOfDay, addDays, isAfter, endOfDay } from 'date-fns';
import { broadcastBookingUpdate } from '../services/sse.service.js';
import { createLogger } from '../lib/core.js';

const log = createLogger('BookingWorker');

export const processBooking = async (job: Job<BookingJobData>) => {
    const { spaceId, userId, userName, startTime, endTime, participants, notes, slotIndex, slotId, orgId, isAdmin } = job.data;
    log.info('Processing booking', { spaceId, userId, slotIndex, slotId, isAdmin });

    const start = new Date(startTime);
    const end = new Date(endTime);

    // Fetch space with rules for validation
    const space = await prisma.space.findUnique({
        where: { id: spaceId },
        include: { rules: true }
    });

    if (!space) throw new Error('SPACE_NOT_FOUND');

    const rules = space.rules;

    // === RULE VALIDATION === (Skip for admins)
    if (rules && !isAdmin) {
        const now = new Date();
        const durationMin = (end.getTime() - start.getTime()) / (1000 * 60);

        // 1. Check maxAdvanceDays - interpret as "booking allowed through X days from now"
        const maxAllowedDate = endOfDay(addDays(now, rules.maxAdvanceDays));
        if (isAfter(start, maxAllowedDate)) {
            throw new Error(`BOOKING_TOO_FAR_AHEAD`);
        }

        // 2. Check maxDurationMin
        if (durationMin > rules.maxDurationMin) {
            throw new Error(`BOOKING_TOO_LONG`);
        }

        // 3. Check booking window (openTime/closeTime)
        const startHour = start.getHours();
        const startMin = start.getMinutes();
        const endHour = end.getHours();
        const endMin = end.getMinutes();
        const [openH, openM] = rules.openTime.split(':').map(Number);
        const [closeH, closeM] = rules.closeTime.split(':').map(Number);

        const startTimeNum = startHour * 60 + startMin;
        const endTimeNum = endHour * 60 + endMin;
        const openTimeNum = openH * 60 + openM;
        const closeTimeNum = closeH * 60 + closeM;

        if (startTimeNum < openTimeNum || endTimeNum > closeTimeNum) {
            throw new Error('OUTSIDE_BOOKING_HOURS');
        }

        // 4. Check maxBookingsPerUserPerDay (CROSS-SPACE for same type)
        // This rule applies across ALL spaces of the same type within the org
        if (rules.maxBookingsPerUserPerDay) {
            const dayStart = new Date(start);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(start);
            dayEnd.setHours(23, 59, 59, 999);

            // Get all spaces of the same type in this org
            const sameTypeSpaces = await prisma.space.findMany({
                where: {
                    orgId: space.orgId,
                    type: space.type,
                    isActive: true
                },
                select: { id: true }
            });
            const sameTypeSpaceIds = sameTypeSpaces.map(s => s.id);

            // Count user's bookings across ALL spaces of this type
            const userBookingsToday = await prisma.booking.count({
                where: {
                    userId,
                    spaceId: { in: sameTypeSpaceIds },
                    status: 'CONFIRMED',
                    startTime: { gte: dayStart, lte: dayEnd }
                }
            });

            log.debug('Rule check', { maxBookingsPerUserPerDay: rules.maxBookingsPerUserPerDay, userBookingsToday, spaceType: space.type, sameTypeSpaces: sameTypeSpaceIds.length });

            if (userBookingsToday >= rules.maxBookingsPerUserPerDay) {
                throw new Error('MAX_BOOKINGS_PER_USER_PER_DAY_EXCEEDED');
            }
        }

        // 5. Check maxTotalBookingsPerDay
        if (rules.maxTotalBookingsPerDay) {
            const dayStart = new Date(start);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(start);
            dayEnd.setHours(23, 59, 59, 999);

            const totalBookingsToday = await prisma.booking.count({
                where: {
                    spaceId,
                    status: 'CONFIRMED',
                    startTime: { gte: dayStart, lte: dayEnd }
                }
            });

            if (totalBookingsToday >= rules.maxTotalBookingsPerDay) {
                throw new Error('MAX_TOTAL_BOOKINGS_PER_DAY_EXCEEDED');
            }
        }

        // 6. Check maxActiveBookingsPerUser
        if (rules.maxActiveBookingsPerUser) {
            const activeBookings = await prisma.booking.count({
                where: {
                    userId,
                    spaceId,
                    status: 'CONFIRMED',
                    endTime: { gt: now }
                }
            });

            if (activeBookings >= rules.maxActiveBookingsPerUser) {
                throw new Error('MAX_ACTIVE_BOOKINGS_EXCEEDED');
            }
        }
    }

    // Use transaction for atomicity
    const booking = await prisma.$transaction(async (tx) => {
        let targetSlotId = slotId;
        let targetSlotIndex = slotIndex;

        // Resolve Slot info if needed
        if (targetSlotId && targetSlotIndex === undefined) {
            const slot = await tx.slot.findUnique({ where: { id: targetSlotId } });
            if (!slot) throw new Error('SLOT_NOT_FOUND');
            if (slot.spaceId !== spaceId) throw new Error('SLOT_MISMATCH');
            targetSlotIndex = slot.number - 1; // 0-based index for frontend
        } else if (targetSlotIndex !== undefined && !targetSlotId) {
            const slot = await tx.slot.findUnique({
                where: {
                    spaceId_number: {
                        spaceId,
                        number: targetSlotIndex + 1 // 1-based number
                    }
                }
            });
            if (slot) targetSlotId = slot.id;
        }

        // Check for conflicts
        const conflictWhere: any = {
            spaceId,
            status: 'CONFIRMED',
            AND: [
                { startTime: { lt: end } },
                { endTime: { gt: start } }
            ]
        };

        if (targetSlotId) {
            conflictWhere.slotId = targetSlotId;
        } else if (targetSlotIndex !== undefined) {
            conflictWhere.OR = [
                { slotIndex: targetSlotIndex },
                ...(targetSlotIndex === 0 ? [{ slotIndex: null }] : []),
            ];
        }

        const conflict = await tx.booking.findFirst({ where: conflictWhere });

        if (conflict) {
            throw new Error('SLOT_ALREADY_BOOKED');
        }

        // Create the booking
        return tx.booking.create({
            data: {
                spaceId,
                userId,
                startTime: start,
                endTime: end,
                status: 'CONFIRMED',
                participants: participants as any,
                notes,
                slotIndex: targetSlotIndex,
                slotId: targetSlotId,
            },
            include: {
                space: { select: { name: true } },
                user: { select: { name: true, avatarUrl: true } },
            },
        });
    });

    // Broadcast update to connected clients
    broadcastBookingUpdate(orgId, {
        type: 'BOOKING_CREATED',
        payload: {
            spaceId,
            date: start.toISOString().split('T')[0],
            booking: {
                id: booking.id,
                startTime: booking.startTime.toISOString(),
                endTime: booking.endTime.toISOString(),
                userName,
                slotIndex: booking.slotIndex || undefined,
            },
        },
    });

    return booking;
}

let worker: Worker | null = null;

export async function startBookingWorker() {
    worker = new Worker<BookingJobData>('bookings', processBooking, {
        connection: redis as any, // Cast to bypass ioredis version mismatch
        concurrency: 5,
    });

    worker.on('completed', (job) => {
        log.info('Booking completed', { jobId: job.id });
    });

    worker.on('failed', (job, err) => {
        log.error('Booking failed', { jobId: job?.id, error: err.message });
    });

    return worker;
}

export async function stopBookingWorker() {
    if (worker) {
        await worker.close();
        worker = null;
    }
}
