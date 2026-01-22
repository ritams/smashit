import { z } from 'zod';

export const updateUserProfileSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    phoneNumber: z.string().max(20).optional().nullable(),
    registrationId: z.string().max(50).optional().nullable(),
});

export type UpdateUserProfileInput = z.infer<typeof updateUserProfileSchema>;
