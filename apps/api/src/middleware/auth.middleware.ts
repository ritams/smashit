import { Response, NextFunction } from 'express';
import { prisma } from '@smashit/database';
import { createError } from './error.middleware.js';
import { OrgRequest } from './org.middleware.js';

export interface AuthRequest extends OrgRequest {
    user?: {
        id: string;
        email: string;
        name: string;
        role: 'ADMIN' | 'MEMBER';
        orgId: string;
    };
}

// For now, we'll use a simple header-based auth
// This will be replaced with proper JWT validation from NextAuth
export async function authMiddleware(
    req: AuthRequest,
    _res: Response,
    next: NextFunction
) {
    try {
        const userId = req.headers['x-user-id'] as string;
        const userEmail = req.headers['x-user-email'] as string;

        if (!userId || !userEmail) {
            throw createError('Authentication required', 401, 'UNAUTHORIZED');
        }

        const user = await prisma.user.findFirst({
            where: {
                id: userId,
                email: userEmail,
                orgId: req.org?.id,
            },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                orgId: true,
            },
        });

        if (!user) {
            throw createError('User not found', 401, 'UNAUTHORIZED');
        }

        req.user = user;
        next();
    } catch (error) {
        next(error);
    }
}

export async function adminMiddleware(
    req: AuthRequest,
    _res: Response,
    next: NextFunction
) {
    try {
        if (req.user?.role !== 'ADMIN') {
            throw createError('Admin access required', 403, 'FORBIDDEN');
        }
        next();
    } catch (error) {
        next(error);
    }
}
