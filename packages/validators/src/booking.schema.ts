import { z } from 'zod';

export const createBookingSchema = z.object({
    spaceId: z.string().uuid(),
    startTime: z.string().datetime(),
    endTime: z.string().datetime(),
    participants: z
        .array(
            z.object({
                name: z.string().min(1),
                email: z.string().email().optional(),
            })
        )
        .optional()
        .default([]),
    notes: z.string().max(500).optional(),
});

export const getAvailabilitySchema = z.object({
    spaceId: z.string().uuid(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const cancelBookingSchema = z.object({
    bookingId: z.string().uuid(),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type GetAvailabilityInput = z.infer<typeof getAvailabilitySchema>;
