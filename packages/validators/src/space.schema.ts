import { z } from 'zod';

export const createSpaceSchema = z.object({
    name: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    capacity: z.number().int().min(1).max(100).optional().default(1),
});

export const updateSpaceSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(500).optional(),
    capacity: z.number().int().min(1).max(100).optional(),
    isActive: z.boolean().optional(),
});

export const updateBookingRulesSchema = z.object({
    slotDurationMin: z.number().int().min(15).max(480).optional(),
    openTime: z
        .string()
        .regex(/^([01]\d|2[0-3]):([0-5]\d)$/)
        .optional(),
    closeTime: z
        .string()
        .regex(/^([01]\d|2[0-3]):([0-5]\d)$/)
        .optional(),
    maxAdvanceDays: z.number().int().min(1).max(90).optional(),
    maxDurationMin: z.number().int().min(15).max(480).optional(),
    allowRecurring: z.boolean().optional(),
    bufferMinutes: z.number().int().min(0).max(60).optional(),
});

export type CreateSpaceInput = z.infer<typeof createSpaceSchema>;
export type UpdateSpaceInput = z.infer<typeof updateSpaceSchema>;
export type UpdateBookingRulesInput = z.infer<typeof updateBookingRulesSchema>;
