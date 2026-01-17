import { Worker, Job } from 'bullmq';
import { prisma } from '@smashit/database';
import { redis } from '../lib/redis.js';
import { BookingJobData } from '../lib/queue.js';
import { broadcastBookingUpdate } from '../services/sse.service.js';

async function processBooking(job: Job<BookingJobData>) {
    const { spaceId, userId, userName, startTime, endTime, participants, notes, orgId } = job.data;

    const start = new Date(startTime);
    const end = new Date(endTime);

    // Use transaction for atomicity
    const booking = await prisma.$transaction(async (tx) => {
        // Check for conflicts
        const conflict = await tx.booking.findFirst({
            where: {
                spaceId,
                status: 'CONFIRMED',
                OR: [
                    {
                        AND: [
                            { startTime: { lt: end } },
                            { endTime: { gt: start } },
                        ],
                    },
                ],
            },
        });

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
            },
        },
    });

    return booking;
}

let worker: Worker | null = null;

export async function startBookingWorker() {
    worker = new Worker<BookingJobData>('bookings', processBooking, {
        connection: redis,
        concurrency: 5,
    });

    worker.on('completed', (job) => {
        console.log(`✅ Booking ${job.id} completed`);
    });

    worker.on('failed', (job, err) => {
        console.error(`❌ Booking ${job?.id} failed:`, err.message);
    });

    return worker;
}

export async function stopBookingWorker() {
    if (worker) {
        await worker.close();
        worker = null;
    }
}
