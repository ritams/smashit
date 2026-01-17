import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '@smashit/database';

export const userRoutes = Router();

// Get current user's organizations (memberships)
userRoutes.get('/me/orgs', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userEmail = req.headers['x-user-email'] as string;

        if (!userEmail) {
            return res.status(401).json({
                success: false,
                error: { code: 'UNAUTHORIZED', message: 'Not logged in' },
            });
        }

        const user = await prisma.user.findUnique({
            where: { email: userEmail },
            include: {
                memberships: {
                    include: {
                        org: {
                            select: {
                                id: true,
                                name: true,
                                slug: true,
                            },
                        },
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
userRoutes.get('/me', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userEmail = req.headers['x-user-email'] as string;

        if (!userEmail) {
            return res.status(401).json({
                success: false,
                error: { code: 'UNAUTHORIZED', message: 'Not logged in' },
            });
        }

        const user = await prisma.user.findUnique({
            where: { email: userEmail },
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
                        org: {
                            select: {
                                id: true,
                                name: true,
                                slug: true,
                            },
                        },
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

        // Flatten memberships for easier consumption
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
userRoutes.patch('/me', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userEmail = req.headers['x-user-email'] as string;
        const { name, phoneNumber, registrationId } = req.body;

        if (!userEmail) {
            return res.status(401).json({
                success: false,
                error: { code: 'UNAUTHORIZED', message: 'Not logged in' },
            });
        }

        const updatedUser = await prisma.user.update({
            where: { email: userEmail },
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
