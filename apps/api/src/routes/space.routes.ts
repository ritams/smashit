import { Router } from 'express';
import { prisma } from '@smashit/database';
import { getAvailabilitySchema } from '@smashit/validators';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';
import { startOfDay as getStartOfDay, addHours, addMinutes } from 'date-fns';

import { orgMiddleware, OrgRequest } from '../middleware/org.middleware.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware.js';
import { getDetailedSpaceAvailability } from '../services/availability.service.js';

export const spaceRoutes: Router = Router({ mergeParams: true });

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
        console.log('[API] /all/availability called', { query: req.query, params: req.params });
        const { date, timezone: queryTimezone } = getAvailabilitySchema
            .omit({ spaceId: true })
            .parse(req.query);

        const spaces = await prisma.space.findMany({
            where: {
                orgId: req.org!.id,
                isActive: true,
            },
        });
        console.log('[API] Found spaces:', spaces.length, spaces.map(s => s.id));

        const availabilityPromises = spaces.map(space =>
            getDetailedSpaceAvailability({
                spaceId: space.id,
                date,
                orgTimezone: queryTimezone || req.org?.timezone
            }).catch(err => {
                console.error(`[API] Error fetching availability for space ${space.id}:`, err);
                throw err;
            })
        );

        const results = await Promise.all(availabilityPromises);

        res.json({
            success: true,
            data: results
        });
    } catch (error) {
        console.error('[API] /all/availability failed:', error);
        next(error);
    }
});

// Get availability for a space on a specific date (Move to top)
// Regex enforces UUID format to avoid matching 'all'
spaceRoutes.get('/:spaceId([0-9a-fA-F\\-]{36})/availability', async (req: OrgRequest, res, next) => {
    try {
        let { spaceId } = req.params as { spaceId: string };

        // URL is like /UUID/availability...
        const parts = req.url.split('/');
        // parts[0] is empty, parts[1] is UUID, parts[2] is availability
        if (parts.length > 1) {
            spaceId = parts[1];
        }

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


