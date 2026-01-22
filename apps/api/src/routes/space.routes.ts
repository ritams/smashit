import { Router } from 'express';
import { prisma } from '@smashit/database';
import { getAvailabilitySchema } from '@smashit/validators';

import { orgMiddleware, OrgRequest } from '../middleware/org.middleware.js';
import { authMiddleware, ensureOrgAccess } from '../middleware/auth.middleware.js';
import { getDetailedSpaceAvailability } from '../services/availability.service.js';

export const spaceRoutes: Router = Router({ mergeParams: true });

// Apply org middleware and auth middleware to all routes
spaceRoutes.use(orgMiddleware);
spaceRoutes.use(authMiddleware);
spaceRoutes.use(ensureOrgAccess);

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
                slots: { orderBy: { number: 'asc' } },
            },
            orderBy: { name: 'asc' },
        });

        res.json({ success: true, data: spaces });
    } catch (error) {
        next(error);
    }
});

// Get availability for ALL spaces on a specific date
spaceRoutes.get('/all/availability', async (req: OrgRequest, res, next) => {
    try {
        const { date, timezone: queryTimezone } = getAvailabilitySchema
            .omit({ spaceId: true })
            .parse(req.query);

        const spaces = await prisma.space.findMany({
            where: {
                orgId: req.org!.id,
                isActive: true,
            },
        });

        const availabilityPromises = spaces.map(async space => {
            try {
                return await getDetailedSpaceAvailability({
                    spaceId: space.id,
                    date,
                    orgTimezone: queryTimezone || req.org?.timezone
                });
            } catch (error) {
                // Log error but don't fail the entire request
                console.error(`Failed to get availability for space ${space.id}:`, error);
                return null;
            }
        });

        const results = (await Promise.all(availabilityPromises)).filter((r): r is NonNullable<typeof r> => r !== null);

        res.json({
            success: true,
            data: results
        });
    } catch (error) {
        next(error);
    }
});

// Get availability for a space on a specific date
// Regex enforces UUID format to avoid matching 'all'
spaceRoutes.get('/:spaceId([0-9a-fA-F\\-]{36})/availability', async (req: OrgRequest, res, next) => {
    try {
        const { spaceId } = req.params as { spaceId: string };

        const { date, timezone: queryTimezone } = getAvailabilitySchema.parse({
            ...req.query,
            spaceId
        });

        const result = await getDetailedSpaceAvailability({
            spaceId,
            date,
            orgTimezone: queryTimezone || req.org?.timezone
        });

        res.json({
            success: true,
            data: {
                space: result.space,
                date,
                slots: result.slots,
            },
        });
    } catch (error) {
        next(error);
    }
});

// Get single space with availability
spaceRoutes.get('/:spaceId', async (req: OrgRequest, res, next) => {
    try {
        const { spaceId } = req.params as { spaceId: string };

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


