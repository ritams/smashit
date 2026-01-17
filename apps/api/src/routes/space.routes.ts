import { Router } from 'express';
import { prisma } from '@smashit/database';
import { orgMiddleware, OrgRequest } from '../middleware/org.middleware.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware.js';

export const spaceRoutes = Router({ mergeParams: true });

// Apply org middleware to all routes
spaceRoutes.use(orgMiddleware);

// Get all spaces for an organization
spaceRoutes.get('/', async (req: OrgRequest, res, next) => {
    try {
        const spaces = await prisma.space.findMany({
            where: {
                orgId: req.org!.id,
                isActive: true,
            },
            include: {
                rules: true,
            },
            orderBy: { name: 'asc' },
        });

        res.json({ success: true, data: spaces });
    } catch (error) {
        next(error);
    }
});

// Get single space with availability
spaceRoutes.get('/:spaceId', async (req: OrgRequest, res, next) => {
    try {
        const { spaceId } = req.params;

        const space = await prisma.space.findFirst({
            where: {
                id: spaceId,
                orgId: req.org!.id,
            },
            include: {
                rules: true,
            },
        });

        if (!space) {
            return res.status(404).json({
                success: false,
                error: { code: 'SPACE_NOT_FOUND', message: 'Space not found' },
            });
        }

        res.json({ success: true, data: space });
    } catch (error) {
        next(error);
    }
});

// Get availability for a space on a specific date
spaceRoutes.get('/:spaceId/availability', async (req: OrgRequest, res, next) => {
    try {
        const { spaceId } = req.params;
        const { date } = req.query;

        if (!date || typeof date !== 'string') {
            return res.status(400).json({
                success: false,
                error: { code: 'INVALID_DATE', message: 'Date parameter is required (YYYY-MM-DD)' },
            });
        }

        // Validate date format
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return res.status(400).json({
                success: false,
                error: { code: 'INVALID_DATE', message: 'Date must be in YYYY-MM-DD format' },
            });
        }

        const space = await prisma.space.findFirst({
            where: {
                id: spaceId,
                orgId: req.org!.id,
            },
            include: { rules: true },
        });

        if (!space || !space.rules) {
            return res.status(404).json({
                success: false,
                error: { code: 'SPACE_NOT_FOUND', message: 'Space not found' },
            });
        }

        const { rules } = space;

        // Parse date and create time range for the day
        const dayStart = new Date(`${date}T${rules.openTime}:00.000Z`);
        const dayEnd = new Date(`${date}T${rules.closeTime}:00.000Z`);

        // Get all bookings for this space on this date
        const bookings = await prisma.booking.findMany({
            where: {
                spaceId,
                status: 'CONFIRMED',
                startTime: { gte: dayStart },
                endTime: { lte: dayEnd },
            },
            include: {
                user: {
                    select: { id: true, name: true, avatarUrl: true },
                },
            },
            orderBy: { startTime: 'asc' },
        });

        // Generate time slots
        const slots = [];
        const slotDuration = rules.slotDurationMin * 60 * 1000;
        let currentTime = dayStart.getTime();

        while (currentTime + slotDuration <= dayEnd.getTime()) {
            const slotStart = new Date(currentTime);
            const slotEnd = new Date(currentTime + slotDuration);

            const overlappingBooking = bookings.find(
                (b) => b.startTime < slotEnd && b.endTime > slotStart
            );

            if (overlappingBooking) {
                slots.push({
                    startTime: slotStart.toISOString(),
                    endTime: slotEnd.toISOString(),
                    isAvailable: false,
                    booking: {
                        id: overlappingBooking.id,
                        userId: overlappingBooking.userId,
                        userName: overlappingBooking.user.name,
                        userAvatar: overlappingBooking.user.avatarUrl,
                        participants: overlappingBooking.participants,
                    },
                });
            } else {
                slots.push({
                    startTime: slotStart.toISOString(),
                    endTime: slotEnd.toISOString(),
                    isAvailable: true,
                });
            }

            currentTime += slotDuration;
        }

        res.json({
            success: true,
            data: {
                space: {
                    id: space.id,
                    name: space.name,
                    capacity: space.capacity,
                },
                date,
                slots,
            },
        });
    } catch (error) {
        next(error);
    }
});
