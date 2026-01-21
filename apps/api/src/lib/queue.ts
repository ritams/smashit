import { Queue, QueueEvents } from 'bullmq';
import { redis } from './redis.js';

export interface BookingJobData {
    spaceId: string;
    userId: string;
    userName: string;
    startTime: string;
    endTime: string;
    participants: Array<{ name: string; email?: string }>;
    notes?: string;
    slotIndex?: number;
    slotId?: string;
    orgId: string;
    isAdmin?: boolean; // Admin users bypass booking rules
}

export const bookingQueue = new Queue<BookingJobData>('bookings', {
    connection: redis as any, // Cast to bypass ioredis version mismatch
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 1000,
        },
        removeOnComplete: 100,
        removeOnFail: 100,
    },
});

// QueueEvents for waiting on job completion
export const bookingQueueEvents = new QueueEvents('bookings', {
    connection: redis as any, // Cast to bypass ioredis version mismatch
});
