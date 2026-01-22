import { Response, NextFunction } from 'express';
import { prisma } from '@smashit/database';
import { createError } from './error.middleware.js';
import { OrgRequest } from './org.middleware.js';
import { findOrCreateUser } from '../services/user.service.js';
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
 * Authentication middleware - verifies JWT token
 * 
 * Extracts Bearer token from Authorization header, validates it,
 * and populates req.user with the authenticated user's info.
 * Does NOT check organization membership.
 * 
 * @throws 401 if no token provided or token is invalid
 */
export async function authMiddleware(
    req: AuthRequest,
    _res: Response,
    next: NextFunction
) {
    try {
        const correlationId = (req as any).correlationId;
        const authHeader = req.headers.authorization;
        const token = extractBearerToken(authHeader);

        if (!token) {
            log.debug('No token provided', { path: req.path, correlationId });
            throw createError('Authentication required', 401, 'UNAUTHORIZED');
        }

        const jwtUser = await verifySessionToken(token);
        if (!jwtUser) {
            log.warn('Invalid token', { path: req.path, correlationId });
            throw createError('Invalid token', 401, 'INVALID_TOKEN');
        }

        // Use shared user service to sync with DB
        const user = await findOrCreateUser({
            email: jwtUser.email,
            name: jwtUser.name,
            googleId: jwtUser.sub,
            avatarUrl: jwtUser.picture,
        });

        req.user = {
            id: user.id,
            email: user.email,
            name: user.name,
        };

        log.debug('Authenticated', { userId: user.id, email: user.email, correlationId });
        next();
    } catch (error) {
        next(error);
    }
}

/**
 * Organization access middleware - checks user authorization
 * 
 * Verifies the authenticated user has access to the organization based on:
 * 1. Allowed email domains
 * 2. Allowed email addresses
 * 3. Admin role (bypasses restrictions)
 * 
 * Creates membership if user is allowed but not yet a member.
 * 
 * @throws 401 if user not authenticated
 * @throws 403 if user's email not on allowlist
 * @throws 500 if organization context missing
 */
export async function ensureOrgAccess(
    req: AuthRequest,
    _res: Response,
    next: NextFunction
) {
    try {
        if (!req.user) {
            throw createError('User not authenticated', 401, 'UNAUTHORIZED');
        }
        if (!req.org) {
            // This middleware expects orgMiddleware to have run
            throw createError('Organization context missing', 500, 'INTERNAL_ERROR');
        }

        // Check Access Control (Allowlists)
        const { allowedDomains, allowedEmails } = req.org;
        const hasRestrictions = (allowedDomains && allowedDomains.length > 0) || (allowedEmails && allowedEmails.length > 0);
        let isAllowed = !hasRestrictions;

        if (hasRestrictions) {
            const domain = req.user.email.split('@')[1];
            isAllowed = allowedDomains?.includes(domain) || allowedEmails?.includes(req.user.email);
        }

        // Check Existing Membership
        let membership = await prisma.membership.findUnique({
            where: {
                userId_orgId: { userId: req.user.id, orgId: req.org.id },
            },
        });

        // Block if not allowed AND not an admin
        if (!isAllowed) {
            if (membership && membership.role === 'ADMIN') {
                log.info('Admin bypassing access control', { userId: req.user.id });
            } else {
                log.warn('Access denied by policy', { email: req.user.email, orgId: req.org.id });
                throw createError('Access denied: Your email is not allowed in this organization', 403, 'ACCESS_DENIED');
            }
        }

        // Create membership if needed
        if (!membership) {
            membership = await prisma.membership.create({
                data: { userId: req.user.id, orgId: req.org.id, role: 'MEMBER' },
            });
            log.info('Created membership', { userId: req.user.id, orgId: req.org.id });
        }

        req.membership = {
            id: membership.id,
            role: membership.role as 'ADMIN' | 'MEMBER',
        };

        next();
    } catch (error) {
        next(error);
    }
}

export const adminMiddleware = async (
    req: AuthRequest,
    _res: Response,
    next: NextFunction
) => {
    try {
        if (!req.membership || req.membership.role !== 'ADMIN') {
            throw createError('Admin access required', 403, 'FORBIDDEN');
        }
        next();
    } catch (error) {
        next(error);
    }
};
