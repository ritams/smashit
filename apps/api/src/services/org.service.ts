import { prisma } from '@smashit/database';
import { redisClient, createLogger } from '../lib/core.js';
import { createOrganizationSchema } from '@smashit/validators';
import { findOrCreateUser } from './user.service.js';
import { z } from 'zod';

const log = createLogger('OrgService');

type CreateOrganizationSchema = z.infer<typeof createOrganizationSchema>;

const CACHE_TTL = 60 * 5; // 5 minutes

export class OrgService {
    /**
     * Get organization by slug with caching
     */
    static async getOrgBySlug(slug: string) {
        const cacheKey = `org:slug:${slug}`;

        try {
            if (redisClient) {
                const cached = await redisClient.get(cacheKey);
                if (cached) {
                    log.debug('Cache hit for org', { slug });
                    return JSON.parse(cached);
                }
            }
        } catch (err) {
            log.warn('Redis cache error', { error: (err as Error).message });
        }

        const org = await prisma.organization.findUnique({
            where: { slug },
            select: {
                id: true,
                name: true,
                slug: true,
                timezone: true,
                settings: true,
                allowedDomains: true,
                allowedEmails: true,
            },
        });

        if (org && redisClient) {
            await redisClient.setex(cacheKey, CACHE_TTL, JSON.stringify(org));
        }

        return org;
    }

    /**
     * Check if a slug is available
     */
    static async isSlugAvailable(slug: string): Promise<boolean> {
        const existing = await prisma.organization.findUnique({
            where: { slug },
            select: { id: true },
        });
        return !existing;
    }

    /**
     * Create a new organization and assign admin role
     */
    static async createOrg(
        data: CreateOrganizationSchema,
        userOrId: string | {
            email: string;
            name: string;
            googleId: string;
            avatarUrl?: string;
        }
    ) {
        // Double check availablity (race condition possible but unlikely with uniq constraint)
        const available = await this.isSlugAvailable(data.slug);
        if (!available) {
            throw new Error('SLUG_TAKEN');
        }

        let userId: string;

        if (typeof userOrId === 'string') {
            userId = userOrId;
        } else {
            const user = await findOrCreateUser(userOrId);
            userId = user.id;
        }

        // Create org
        const org = await prisma.organization.create({
            data: {
                name: data.name,
                slug: data.slug,
                timezone: data.timezone || 'Asia/Kolkata',
            },
        });

        // Add user as admin
        await prisma.membership.create({
            data: {
                userId: userId,
                orgId: org.id,
                role: 'ADMIN',
            },
        });

        if (redisClient) {
            // Cache the new org immediately
            await redisClient.setex(`org:slug:${org.slug}`, CACHE_TTL, JSON.stringify(org));
        }

        return { ...org, role: 'ADMIN' };
    }
}
