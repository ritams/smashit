import { Response, NextFunction } from 'express';
import { createError } from './error.middleware.js';
import { OrgRequest } from './org.middleware.js';
import { findOrCreateUser, ensureMembership } from '../services/user.service.js';

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

// Auth middleware - finds or creates global user, then checks membership
export async function authMiddleware(
    req: AuthRequest,
    _res: Response,
    next: NextFunction
) {
    try {
        const userEmail = req.headers['x-user-email'] as string;
        const userName = req.headers['x-user-name'] as string;
        const userGoogleId = req.headers['x-user-google-id'] as string;

        if (!userEmail) {
            throw createError('Authentication required', 401, 'UNAUTHORIZED');
        }

        // Use shared user service
        const user = await findOrCreateUser({
            email: userEmail,
            name: userName,
            googleId: userGoogleId,
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
