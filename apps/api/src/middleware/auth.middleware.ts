import { Response, NextFunction } from 'express';
import { prisma } from '@smashit/database';
import { createError } from './error.middleware.js';
import { OrgRequest } from './org.middleware.js';

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

        // Find or create global user
        let user = await prisma.user.findUnique({
            where: { email: userEmail },
        });

        if (!user) {
            user = await prisma.user.create({
                data: {
                    email: userEmail,
                    name: userName || userEmail.split('@')[0],
                    googleId: userGoogleId || `google-${Date.now()}`,
                },
            });
        }

        req.user = {
            id: user.id,
            email: user.email,
            name: user.name,
        };

        // If there's an org context, check membership
        if (req.org?.id) {
            let membership = await prisma.membership.findUnique({
                where: {
                    userId_orgId: {
                        userId: user.id,
                        orgId: req.org.id,
                    },
                },
            });

            // Auto-create membership as MEMBER if doesn't exist
            if (!membership) {
                membership = await prisma.membership.create({
                    data: {
                        userId: user.id,
                        orgId: req.org.id,
                        role: 'MEMBER',
                    },
                });
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
