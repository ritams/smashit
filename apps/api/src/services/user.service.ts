import { prisma } from '@smashit/database';
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
export async function findOrCreateUser(data: UserData) {
    let user = await prisma.user.findUnique({
        where: { email: data.email },
    });

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
    }

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
