import { Router } from 'express';
import { prisma } from '@smashit/database';
import { createSpaceSchema, updateSpaceSchema, updateBookingRulesSchema } from '@smashit/validators';
import { orgMiddleware } from '../middleware/org.middleware.js';
import { authMiddleware, adminMiddleware, AuthRequest } from '../middleware/auth.middleware.js';

export const adminRoutes = Router({ mergeParams: true });

// Apply middleware
adminRoutes.use(orgMiddleware);
adminRoutes.use(authMiddleware);
adminRoutes.use(adminMiddleware);

// Dashboard stats
adminRoutes.get('/stats', async (req: AuthRequest, res, next) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const [totalUsers, totalSpaces, bookingsToday, upcomingBookings] = await Promise.all([
            prisma.user.count({ where: { orgId: req.org!.id } }),
            prisma.space.count({ where: { orgId: req.org!.id, isActive: true } }),
            prisma.booking.count({
                where: {
                    space: { orgId: req.org!.id },
                    status: 'CONFIRMED',
                    startTime: { gte: today, lt: tomorrow },
                },
            }),
            prisma.booking.count({
                where: {
                    space: { orgId: req.org!.id },
                    status: 'CONFIRMED',
                    startTime: { gte: new Date() },
                },
            }),
        ]);

        res.json({
            success: true,
            data: {
                totalUsers,
                totalSpaces,
                bookingsToday,
                upcomingBookings,
            },
        });
    } catch (error) {
        next(error);
    }
});

// List all users
adminRoutes.get('/users', async (req: AuthRequest, res, next) => {
    try {
        const users = await prisma.user.findMany({
            where: { orgId: req.org!.id },
            select: {
                id: true,
                email: true,
                name: true,
                avatarUrl: true,
                role: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
        });

        res.json({ success: true, data: users });
    } catch (error) {
        next(error);
    }
});

// Update user role
adminRoutes.patch('/users/:userId/role', async (req: AuthRequest, res, next) => {
    try {
        const { userId } = req.params;
        const { role } = req.body;

        if (role !== 'ADMIN' && role !== 'MEMBER') {
            return res.status(400).json({
                success: false,
                error: { code: 'INVALID_ROLE', message: 'Role must be ADMIN or MEMBER' },
            });
        }

        const user = await prisma.user.update({
            where: { id: userId },
            data: { role },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
            },
        });

        res.json({ success: true, data: user });
    } catch (error) {
        next(error);
    }
});

// Create space
adminRoutes.post('/spaces', async (req: AuthRequest, res, next) => {
    try {
        const data = createSpaceSchema.parse(req.body);

        const space = await prisma.space.create({
            data: {
                ...data,
                orgId: req.org!.id,
                rules: {
                    create: {
                        slotDurationMin: 60,
                        openTime: '09:00',
                        closeTime: '21:00',
                        maxAdvanceDays: 7,
                        maxDurationMin: 120,
                        allowRecurring: false,
                        bufferMinutes: 0,
                    },
                },
            },
            include: { rules: true },
        });

        res.status(201).json({ success: true, data: space });
    } catch (error) {
        next(error);
    }
});

// Update space
adminRoutes.patch('/spaces/:spaceId', async (req: AuthRequest, res, next) => {
    try {
        const { spaceId } = req.params;
        const data = updateSpaceSchema.parse(req.body);

        const space = await prisma.space.update({
            where: { id: spaceId },
            data,
            include: { rules: true },
        });

        res.json({ success: true, data: space });
    } catch (error) {
        next(error);
    }
});

// Update booking rules
adminRoutes.patch('/spaces/:spaceId/rules', async (req: AuthRequest, res, next) => {
    try {
        const { spaceId } = req.params;
        const data = updateBookingRulesSchema.parse(req.body);

        const rules = await prisma.bookingRules.update({
            where: { spaceId },
            data,
        });

        res.json({ success: true, data: rules });
    } catch (error) {
        next(error);
    }
});

// Delete space
adminRoutes.delete('/spaces/:spaceId', async (req: AuthRequest, res, next) => {
    try {
        const { spaceId } = req.params;

        await prisma.space.update({
            where: { id: spaceId },
            data: { isActive: false },
        });

        res.json({ success: true, data: { id: spaceId, isActive: false } });
    } catch (error) {
        next(error);
    }
});
