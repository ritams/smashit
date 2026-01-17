import { Queue } from 'bullmq';
import { redis } from './redis.js';

export interface BookingJobData {
    spaceId: string;
    userId: string;
    userName: string;
    startTime: string;
    endTime: string;
    participants: Array<{ name: string; email?: string }>;
    notes?: string;
    orgId: string;
}

export const bookingQueue = new Queue<BookingJobData>('bookings', {
    connection: redis,
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
