import { Router } from 'express';
import { prisma } from '@smashit/database';
import { createSpaceSchema, updateSpaceSchema, updateBookingRulesSchema } from '@smashit/validators';
import { orgMiddleware } from '../middleware/org.middleware.js';
import { authMiddleware, adminMiddleware, AuthRequest } from '../middleware/auth.middleware.js';

export const adminRoutes: Router = Router({ mergeParams: true });

// Apply middleware - must be authenticated and admin
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

        const [totalMembers, totalSpaces, bookingsToday, upcomingBookings] = await Promise.all([
            prisma.membership.count({ where: { orgId: req.org!.id } }),
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
                totalUsers: totalMembers,
                totalSpaces,
                bookingsToday,
                upcomingBookings,
            },
        });
    } catch (error) {
        next(error);
    }
});

// List all members
adminRoutes.get('/members', async (req: AuthRequest, res, next) => {
    try {
        const memberships = await prisma.membership.findMany({
            where: { orgId: req.org!.id },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        avatarUrl: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        const members = memberships.map(m => ({
            id: m.user.id,
            email: m.user.email,
            name: m.user.name,
            avatarUrl: m.user.avatarUrl,
            role: m.role,
            joinedAt: m.createdAt,
        }));

        res.json({ success: true, data: members });
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
                slots: {
                    create: Array.from({ length: data.capacity }, (_, i) => ({
                        number: i + 1,
                        name: `Slot ${i + 1}`,
                    })),
                },
            },
            include: { rules: true, slots: true },
        });

        res.status(201).json({ success: true, data: space });
    } catch (error) {
        next(error);
    }
});

// Update space
adminRoutes.patch('/spaces/:spaceId', async (req: AuthRequest, res, next) => {
    try {
        const { spaceId } = req.params as { spaceId: string };
        const data = updateSpaceSchema.parse(req.body);

        // Verify space belongs to this org
        const existingSpace = await prisma.space.findFirst({
            where: { id: spaceId, orgId: req.org!.id },
        });
        if (!existingSpace) {
            return res.status(404).json({
                success: false,
                error: { code: 'SPACE_NOT_FOUND', message: 'Space not found or does not belong to this organization' },
            });
        }

        const space = await prisma.space.update({
            where: { id: spaceId },
            data,
            include: { rules: true, slots: true },
        });

        // Handle capacity increase
        if (data.capacity && data.capacity > (space as any).slots.length) {
            const currentSlots = (space as any).slots || [];
            const newSlotsCount = data.capacity - currentSlots.length;
            const startNumber = currentSlots.length + 1;

            await prisma.slot.createMany({
                data: Array.from({ length: newSlotsCount }, (_, i) => ({
                    spaceId,
                    number: startNumber + i,
                    name: `Slot ${startNumber + i}`,
                })),
            });

            // Refetch to include new slots
            const updatedSpace = await prisma.space.findUnique({
                where: { id: spaceId },
                include: { rules: true, slots: true },
            });
            return res.json({ success: true, data: updatedSpace });
        }

        res.json({ success: true, data: space });
    } catch (error) {
        next(error);
    }
});

// Update booking rules
adminRoutes.patch('/spaces/:spaceId/rules', async (req: AuthRequest, res, next) => {
    try {
        const { spaceId } = req.params as { spaceId: string };
        const data = updateBookingRulesSchema.parse(req.body);

        // Verify space belongs to this org
        const existingSpace = await prisma.space.findFirst({
            where: { id: spaceId, orgId: req.org!.id },
        });
        if (!existingSpace) {
            return res.status(404).json({
                success: false,
                error: { code: 'SPACE_NOT_FOUND', message: 'Space not found or does not belong to this organization' },
            });
        }

        const rules = await prisma.bookingRules.update({
            where: { spaceId },
            data,
        });

        res.json({ success: true, data: rules });
    } catch (error) {
        next(error);
    }
});

// Bulk update booking rules
adminRoutes.post('/spaces/rules/bulk', async (req: AuthRequest, res, next) => {
    try {
        const { spaceIds, rules } = req.body;

        if (!Array.isArray(spaceIds) || spaceIds.length === 0) {
            return res.status(400).json({ success: false, error: { message: 'spaceIds array required' } });
        }

        const data = updateBookingRulesSchema.parse(rules);

        // Verify all spaces belong to org
        const count = await prisma.space.count({
            where: {
                id: { in: spaceIds },
                orgId: req.org!.id,
            },
        });

        if (count !== spaceIds.length) {
            return res.status(403).json({ success: false, error: { message: 'Some spaces do not belong to this organization' } });
        }

        await prisma.bookingRules.updateMany({
            where: { spaceId: { in: spaceIds } },
            data,
        });

        res.json({ success: true, message: `Updated rules for ${count} spaces` });
    } catch (error) {
        next(error);
    }
});

// Delete space (soft delete)
adminRoutes.delete('/spaces/:spaceId', async (req: AuthRequest, res, next) => {
    try {
        const { spaceId } = req.params as { spaceId: string };

        // Verify space belongs to this org
        const existingSpace = await prisma.space.findFirst({
            where: { id: spaceId, orgId: req.org!.id },
        });
        if (!existingSpace) {
            return res.status(404).json({
                success: false,
                error: { code: 'SPACE_NOT_FOUND', message: 'Space not found or does not belong to this organization' },
            });
        }

        await prisma.space.update({
            where: { id: spaceId },
            data: { isActive: false },
        });

        res.json({ success: true, data: { id: spaceId, isActive: false } });
    } catch (error) {
        next(error);
    }
});
