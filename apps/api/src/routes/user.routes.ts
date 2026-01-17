import { Router, Response, NextFunction } from 'express';
import { prisma } from '@smashit/database';
import { updateUserProfileSchema } from '@smashit/validators';
import { createError } from '../middleware/error.middleware.js';

export const userRoutes: Router = Router();

/**
 * Shared auth extraction - validates user from headers
 * This is needed because user routes don't have org context
 */
interface UserRequest extends Request {
    userEmail?: string;
    userName?: string;
}

async function requireAuth(req: any, res: Response, next: NextFunction) {
    const userEmail = req.headers['x-user-email'] as string;
    if (!userEmail) {
        return res.status(401).json({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Not logged in' },
        });
    }
    req.userEmail = userEmail;
    req.userName = req.headers['x-user-name'] as string;
    next();
}

// Apply auth middleware to all routes
userRoutes.use(requireAuth);

// Get current user's organizations (memberships)
userRoutes.get('/me/orgs', async (req: any, res: Response, next: NextFunction) => {
    try {
        const user = await prisma.user.findUnique({
            where: { email: req.userEmail },
            include: {
                memberships: {
                    include: {
                        org: { select: { id: true, name: true, slug: true } },
                    },
                    orderBy: { createdAt: 'desc' },
                },
            },
        });

        if (!user) {
            return res.json({ success: true, data: [] });
        }

        const orgs = user.memberships.map((m) => ({
            id: m.org.id,
            name: m.org.name,
            slug: m.org.slug,
            role: m.role,
        }));

        res.json({ success: true, data: orgs });
    } catch (error) {
        next(error);
    }
});

// Get current user's profile
userRoutes.get('/me', async (req: any, res: Response, next: NextFunction) => {
    try {
        const user = await prisma.user.findUnique({
            where: { email: req.userEmail },
            select: {
                id: true,
                email: true,
                name: true,
                avatarUrl: true,
                phoneNumber: true,
                registrationId: true,
                createdAt: true,
                memberships: {
                    include: {
                        org: { select: { id: true, name: true, slug: true } },
                    },
                    orderBy: { createdAt: 'desc' },
                },
            },
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                error: { code: 'USER_NOT_FOUND', message: 'User not found' },
            });
        }

        const profile = {
            ...user,
            organizations: user.memberships.map((m) => ({
                id: m.org.id,
                name: m.org.name,
                slug: m.org.slug,
                role: m.role,
            })),
        };

        res.json({ success: true, data: profile });
    } catch (error) {
        next(error);
    }
});

// Update current user's profile
userRoutes.patch('/me', async (req: any, res: Response, next: NextFunction) => {
    try {
        const { name, phoneNumber, registrationId } = updateUserProfileSchema.parse(req.body);

        const updatedUser = await prisma.user.update({
            where: { email: req.userEmail },
            data: {
                ...(name && { name }),
                ...(phoneNumber !== undefined && { phoneNumber }),
                ...(registrationId !== undefined && { registrationId }),
            },
            select: {
                id: true,
                email: true,
                name: true,
                avatarUrl: true,
                phoneNumber: true,
                registrationId: true,
            },
        });

        res.json({ success: true, data: updatedUser });
    } catch (error) {
        next(error);
    }
});

