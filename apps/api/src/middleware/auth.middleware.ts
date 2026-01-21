import { Response, NextFunction } from 'express';
import { prisma } from '@smashit/database';
import { createError } from './error.middleware.js';
import { OrgRequest } from './org.middleware.js';
import { findOrCreateUser, ensureMembership } from '../services/user.service.js';
import { verifySessionToken, extractBearerToken } from '../lib/jwt.js';
import { createLogger } from '../lib/core.js';

const log = createLogger('Auth');

export interface AuthRequest extends OrgRequest {
    user?: {
        id: string;
        email: string;
        name: string;
    };
    membership?: {
        id: string;
        role: 'ADMIN' | 'MEMBER';
    };
}

/**
 * Auth middleware - verifies JWT token from Authorization header
 * Falls back to x-user-* headers only if ALLOW_HEADER_AUTH=true (dev mode)
 */
export async function authMiddleware(
    req: AuthRequest,
    _res: Response,
    next: NextFunction
) {
    try {
        let userEmail: string | undefined;
        let userName: string | undefined;
        let userGoogleId: string | undefined;
        let userAvatar: string | undefined;

        // Primary: Verify JWT from Authorization header
        const authHeader = req.headers.authorization;
        const token = extractBearerToken(authHeader);

        if (token) {
            const jwtUser = await verifySessionToken(token);
            if (jwtUser) {
                userEmail = jwtUser.email;
                userName = jwtUser.name;
                userGoogleId = jwtUser.sub;
                userAvatar = jwtUser.picture;
                log.debug('Authenticated via JWT', { email: userEmail });
            }
        }

        // Fallback: Header-based auth (only in dev/migration mode)
        if (!userEmail && process.env.ALLOW_HEADER_AUTH === 'true') {
            userEmail = req.headers['x-user-email'] as string;
            userName = req.headers['x-user-name'] as string;
            userGoogleId = req.headers['x-user-google-id'] as string;
            userAvatar = req.headers['x-user-avatar'] as string;

            if (userEmail) {
                log.warn('Using header-based auth (insecure fallback)', { email: userEmail });
            }
        }

        if (!userEmail) {
            throw createError('Authentication required', 401, 'UNAUTHORIZED');
        }

        // Use shared user service
        const user = await findOrCreateUser({
            email: userEmail,
            name: userName,
            googleId: userGoogleId,
            avatarUrl: userAvatar,
        });

        req.user = {
            id: user.id,
            email: user.email,
            name: user.name,
        };

        // If there's an org context, check/create membership
        if (req.org?.id) {
            // Check Access Control
            const { allowedDomains, allowedEmails } = req.org;
            const hasRestrictions = (allowedDomains && allowedDomains.length > 0) || (allowedEmails && allowedEmails.length > 0);

            let isAllowed = !hasRestrictions; // Default allow if no rules

            if (hasRestrictions) {
                const domain = user.email.split('@')[1];
                const isDomainAllowed = allowedDomains?.includes(domain);
                const isEmailAllowed = allowedEmails?.includes(user.email);

                if (isDomainAllowed || isEmailAllowed) {
                    isAllowed = true;
                }
            }

            // Check if already a member (admins are always allowed)
            let membership = await prisma.membership.findUnique({
                where: {
                    userId_orgId: { userId: user.id, orgId: req.org.id },
                },
            });

            // If strict enforcement: Block if not allowed, UNLESS they are an existing ADMIN
            // If they are an existing MEMBER but now banned, we block them.
            if (!isAllowed) {
                if (membership && membership.role === 'ADMIN') {
                    // Admins bypass restrictions
                    log.info('Admin bypassing access control', { userId: user.id, email: user.email });
                } else {
                    // Block access
                    log.warn('Access denied by policy', { userId: user.id, email: user.email, orgId: req.org.id });
                    throw createError('Access denied: Your email is not allowed in this organization', 403, 'ACCESS_DENIED');
                }
            }

            if (!membership) {
                membership = await prisma.membership.create({
                    data: { userId: user.id, orgId: req.org.id, role: 'MEMBER' },
                });
                log.info('Created membership', { userId: user.id, orgId: req.org.id, role: 'MEMBER' });
            }

            req.membership = {
                id: membership.id,
                role: membership.role as 'ADMIN' | 'MEMBER',
            };
        }

        next();
    } catch (error) {
        next(error);
    }
}

// Admin middleware - requires ADMIN role in the org
export async function adminMiddleware(
    req: AuthRequest,
    _res: Response,
    next: NextFunction
) {
    try {
        if (!req.membership || req.membership.role !== 'ADMIN') {
            throw createError('Admin access required', 403, 'FORBIDDEN');
        }
        next();
    } catch (error) {
        next(error);
    }
}

