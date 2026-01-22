import { Response, NextFunction } from 'express';
import { prisma } from '@avith/database';
import { createSpaceSchema, updateSpaceSchema, updateBookingRulesSchema, updateOrganizationSchema } from '@avith/validators';
import { broadcastBookingUpdate } from '../services/sse.service.js';
import { AuthRequest } from '../middleware/auth.middleware.js';

/**
 * Admin controller - handles all admin route business logic
 */

// Sport-specific slot naming
const SLOT_PREFIXES: Record<string, string> = {
    BADMINTON: 'Court',
    TENNIS: 'Court',
    TABLE_TENNIS: 'Table',
    FOOTBALL: 'Field',
    BASKETBALL: 'Court',
    CRICKET: 'Net',
    SWIMMING: 'Lane',
    SQUASH: 'Court',
    GENERIC: 'Slot',
};

function getSlotName(type: string, number: number): string {
    const prefix = SLOT_PREFIXES[type] || 'Slot';
    return `${prefix} ${number}`;
}

/** Update organization settings (allowed domains/emails) */
export async function updateSettings(req: AuthRequest, res: Response, next: NextFunction) {
    try {
        const data = updateOrganizationSchema.parse(req.body);
        const org = await prisma.organization.update({
            where: { id: req.org!.id },
            data: { allowedDomains: data.allowedDomains, allowedEmails: data.allowedEmails },
        });
        res.json({ success: true, data: org });
    } catch (error) {
        next(error);
    }
}

/** Get dashboard statistics */
export async function getStats(req: AuthRequest, res: Response, next: NextFunction) {
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
            data: { totalUsers: totalMembers, totalSpaces, bookingsToday, upcomingBookings },
        });
    } catch (error) {
        next(error);
    }
}

/** List all organization members */
export async function getMembers(req: AuthRequest, res: Response, next: NextFunction) {
    try {
        const memberships = await prisma.membership.findMany({
            where: { orgId: req.org!.id },
            include: {
                user: { select: { id: true, email: true, name: true, avatarUrl: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        const members = memberships.map((m: any) => ({
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
}

/** Create a new space */
export async function createSpace(req: AuthRequest, res: Response, next: NextFunction) {
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
                        name: getSlotName(data.type || 'GENERIC', i + 1),
                    })),
                },
            },
            include: { rules: true, slots: true },
        });

        res.status(201).json({ success: true, data: space });
    } catch (error) {
        next(error);
    }
}

/** Update an existing space */
export async function updateSpace(req: AuthRequest, res: Response, next: NextFunction) {
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

        // Handle capacity change
        const currentSlots = (space as any).slots || [];
        if (data.capacity && data.capacity !== currentSlots.length) {
            if (data.capacity > currentSlots.length) {
                const newSlotsCount = data.capacity - currentSlots.length;
                const startNumber = currentSlots.length + 1;
                await prisma.slot.createMany({
                    data: Array.from({ length: newSlotsCount }, (_, i) => ({
                        spaceId,
                        number: startNumber + i,
                        name: getSlotName(space.type, startNumber + i),
                    })),
                });
            } else {
                await prisma.slot.deleteMany({
                    where: { spaceId, number: { gt: data.capacity } },
                });
            }

            const updatedSpace = await prisma.space.findUnique({
                where: { id: spaceId },
                include: { rules: true, slots: { orderBy: { number: 'asc' } } },
            });

            broadcastBookingUpdate(req.org!.id, {
                type: 'SPACE_UPDATED',
                payload: { spaceId, date: new Date().toISOString().split('T')[0] } as any,
            });

            return res.json({ success: true, data: updatedSpace });
        }

        broadcastBookingUpdate(req.org!.id, {
            type: 'SPACE_UPDATED',
            payload: { spaceId, date: new Date().toISOString().split('T')[0] } as any,
        });

        res.json({ success: true, data: space });
    } catch (error) {
        next(error);
    }
}

/** Update booking rules for a space */
export async function updateSpaceRules(req: AuthRequest, res: Response, next: NextFunction) {
    try {
        const { spaceId } = req.params as { spaceId: string };
        const data = updateBookingRulesSchema.parse(req.body);

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
}

/** Bulk update booking rules for multiple spaces */
export async function bulkUpdateRules(req: AuthRequest, res: Response, next: NextFunction) {
    try {
        const { spaceIds, rules } = req.body;

        if (!Array.isArray(spaceIds) || spaceIds.length === 0) {
            return res.status(400).json({ success: false, error: { message: 'spaceIds array required' } });
        }

        const data = updateBookingRulesSchema.parse(rules);

        const count = await prisma.space.count({
            where: { id: { in: spaceIds }, orgId: req.org!.id },
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
}

/** Soft delete a space */
export async function deleteSpace(req: AuthRequest, res: Response, next: NextFunction) {
    try {
        const { spaceId } = req.params as { spaceId: string };

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

        broadcastBookingUpdate(req.org!.id, {
            type: 'SPACE_UPDATED',
            payload: { spaceId, date: new Date().toISOString().split('T')[0] } as any,
        });

        res.json({ success: true, data: { id: spaceId, isActive: false } });
    } catch (error) {
        next(error);
    }
}
