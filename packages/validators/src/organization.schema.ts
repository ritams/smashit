import { z } from 'zod';

export const createOrganizationSchema = z.object({
    name: z.string().min(2).max(100),
    slug: z
        .string()
        .min(2)
        .max(50)
        .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only'),
    timezone: z.string().optional().default('Asia/Kolkata'),
});

export const slugSchema = z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/);

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
