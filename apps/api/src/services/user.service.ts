import { prisma } from '@avith/database';
import { createLogger } from '../lib/core.js';

const log = createLogger('UserService');

export interface UserData {
    email: string;
    name?: string;
    googleId?: string;
    avatarUrl?: string;
}

/**
 * Find or create a user - consolidated logic used across routes
 */
import { redis } from '../lib/core.js';

/**
 * Find or create a user - consolidated logic used across routes
 * 
 * CACHING STRATEGY:
 * We cache the result of this function for 5 minutes. This is critical for performance
 * because this is called on every authenticated request.
 * 
 * - Cache Key: `user:email:{email}`
 * - TTL: 300 seconds (5 minutes)
 * 
 * If a user updates their profile, the cache will eventually expire.
 * This trade-off is acceptable for general API usage.
 */
export async function findOrCreateUser(data: UserData) {
    const CACHE_KEY = `user:email:${data.email}`;
    const CACHE_TTL = 300; // 5 minutes

    try {
        // 1. Try Cache
        const cachedUser = await redis.get(CACHE_KEY);
        if (cachedUser) {
            return JSON.parse(cachedUser);
        }
    } catch (err) {
        log.warn('Redis cache lookup failed', { error: (err as Error).message });
        // Fallthrough to DB
    }

    // 2. Database Lookup
    let user = await prisma.user.findUnique({
        where: { email: data.email },
    });

    // 3. Create if missing
    if (!user) {
        user = await prisma.user.create({
            data: {
                email: data.email,
                name: data.name || data.email.split('@')[0],
                googleId: data.googleId || crypto.randomUUID(),
                avatarUrl: data.avatarUrl || null,
            },
        });
        log.info('Created new user', { email: data.email, id: user.id });
    } else {
        // Optional: Update name/avatar if changed (only on cache miss/expiration)
        // This keeps the profile reasonably fresh without updating on every request
        if (data.name && user.name !== data.name) {
            const updateData: any = {};
            if (data.name) updateData.name = data.name;
            if (data.avatarUrl) updateData.avatarUrl = data.avatarUrl;

            if (Object.keys(updateData).length > 0) {
                user = await prisma.user.update({
                    where: { id: user.id },
                    data: updateData
                });
            }
        }
    }

    // 4. Update Cache (Fire and Forget)
    redis.setex(CACHE_KEY, CACHE_TTL, JSON.stringify(user)).catch(err => {
        log.warn('Redis cache set failed', { error: (err as Error).message });
    });

    return user;
}

/**
 * Ensure user has membership in an org
 */
export async function ensureMembership(userId: string, orgId: string, role: 'ADMIN' | 'MEMBER' = 'MEMBER') {
    let membership = await prisma.membership.findUnique({
        where: {
            userId_orgId: { userId, orgId },
        },
    });

    if (!membership) {
        membership = await prisma.membership.create({
            data: { userId, orgId, role },
        });
        log.info('Created membership', { userId, orgId, role });
    }

    return membership;
}
