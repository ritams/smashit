import { Response, NextFunction } from 'express';
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
            const membership = await ensureMembership(user.id, req.org.id, 'MEMBER');
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

