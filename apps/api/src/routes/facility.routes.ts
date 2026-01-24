import { Router } from 'express';
import { prisma } from '@avith/database';
import { orgMiddleware, OrgRequest } from '../middleware/org.middleware.js';
import { authMiddleware, ensureOrgAccess, AuthRequest } from '../middleware/auth.middleware.js';

export const facilityRoutes: Router = Router({ mergeParams: true });

// Apply standard middleware chain
facilityRoutes.use(orgMiddleware);
facilityRoutes.use(authMiddleware);
facilityRoutes.use(ensureOrgAccess);

/**
 * Get all facilities for an organization (User access)
 */
facilityRoutes.get('/', async (req: AuthRequest, res, next) => {
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
});
