import { Response, NextFunction } from 'express';
import { prisma } from '@avith/database';
import {
    createFacilitySchema,
    updateFacilitySchema,
    createSpaceSchema,
    updateSpaceSchema,
    updateBookingRulesSchema,
    updateOrganizationSchema
} from '@avith/validators';
import { broadcastBookingUpdate } from '../services/sse.service.js';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { OrgService } from '../services/org.service.js';

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

        // Invalidate cache immediately so new settings are visible
        await OrgService.invalidateOrgCache(req.org!.slug);

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

/** List all facilities with their spaces */
export async function getFacilities(req: AuthRequest, res: Response, next: NextFunction) {
    try {
        const facilities = await prisma.facility.findMany({
            where: { orgId: req.org!.id },
            include: {
                spaces: {
                    where: { isActive: true },
                    include: { slots: true },
                },
                rules: true,
            },
            orderBy: { name: 'asc' },
        });

        res.json({ success: true, data: facilities });
    } catch (error) {
        next(error);
    }
}

/** Create a new facility */
export async function createFacility(req: AuthRequest, res: Response, next: NextFunction) {
    try {
        const data = createFacilitySchema.parse(req.body);
        const facility = await prisma.facility.create({
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

        res.status(201).json({ success: true, data: facility });
    } catch (error) {
        next(error);
    }
}

/** Update a facility */
export async function updateFacility(req: AuthRequest, res: Response, next: NextFunction) {
    try {
        const { facilityId } = req.params as { facilityId: string };
        const data = updateFacilitySchema.parse(req.body);

        const facility = await prisma.facility.update({
            where: { id: facilityId, orgId: req.org!.id },
            data,
            include: { rules: true },
        });

        res.json({ success: true, data: facility });
    } catch (error) {
        next(error);
    }
}

/** Update facility rules */
export async function updateFacilityRules(req: AuthRequest, res: Response, next: NextFunction) {
    try {
        const { facilityId } = req.params as { facilityId: string };
        const data = updateBookingRulesSchema.parse(req.body);

        const rules = await prisma.bookingRules.update({
            where: { facilityId },
            data,
        });

        res.json({ success: true, data: rules });
    } catch (error) {
        next(error);
    }
}

/** Bulk update rules for multiple facilities */
export async function bulkUpdateFacilityRules(req: AuthRequest, res: Response, next: NextFunction) {
    try {
        const { facilityIds, rules } = req.body;
        const data = updateBookingRulesSchema.parse(rules);

        await prisma.bookingRules.updateMany({
            where: { facilityId: { in: facilityIds }, facility: { orgId: req.org!.id } },
            data,
        });

        res.json({ success: true, message: 'Rules updated for selected facilities' });
    } catch (error) {
        next(error);
    }
}

/** Delete a facility */
export async function deleteFacility(req: AuthRequest, res: Response, next: NextFunction) {
    try {
        const { facilityId } = req.params as { facilityId: string };
        await prisma.facility.delete({ where: { id: facilityId, orgId: req.org!.id } });
        res.json({ success: true, message: 'Facility deleted' });
    } catch (error) {
        next(error);
    }
}

/** Create a new space in a facility */
export async function createSpace(req: AuthRequest, res: Response, next: NextFunction) {
    try {
        const data = createSpaceSchema.parse(req.body);
        const facility = await prisma.facility.findFirst({
            where: { id: data.facilityId, orgId: req.org!.id },
        });

        if (!facility) {
            return res.status(404).json({ success: false, error: { message: 'Facility not found' } });
        }

        const space = await prisma.space.create({
            data: {
                name: data.name,
                capacity: data.capacity,
                facilityId: data.facilityId,
                orgId: req.org!.id,
                slots: {
                    create: Array.from({ length: data.capacity || 1 }, (_, i) => ({
                        number: i + 1,
                        name: getSlotName(facility.type, i + 1),
                    })),
                },
            },
            include: { slots: true },
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

        const existingSpace = await prisma.space.findFirst({
            where: { id: spaceId, orgId: req.org!.id },
            include: { facility: true },
        });

        if (!existingSpace) {
            return res.status(404).json({ success: false, error: { message: 'Space not found' } });
        }

        const space = await prisma.space.update({
            where: { id: spaceId },
            data,
            include: { slots: { orderBy: { number: 'asc' } } },
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
                        name: getSlotName(existingSpace.facility.type, startNumber + i),
                    })),
                });
            } else {
                await prisma.slot.deleteMany({
                    where: { spaceId, number: { gt: data.capacity } },
                });
            }

            const updatedSpace = await prisma.space.findUnique({
                where: { id: spaceId },
                include: { slots: { orderBy: { number: 'asc' } } },
            });

            return res.json({ success: true, data: updatedSpace });
        }

        res.json({ success: true, data: space });
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
