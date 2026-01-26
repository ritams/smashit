import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '@avith/database';

import { createOrganizationSchema } from '@avith/validators';
import { OrgService } from '../services/org.service.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware.js';
import { authLimiter, createLogger } from '../lib/core.js';

const log = createLogger('OrgRoutes');

export const orgRoutes: Router = Router();

// Create new organization (authenticated)
orgRoutes.post('/', authLimiter, authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.user) {
            return res.status(401).json({ success: false, error: { message: 'Authentication required' } });
        }

        const data = createOrganizationSchema.parse(req.body);
        const org = await OrgService.createOrg(data, req.user.id);

        res.status(201).json({
            success: true,
            data: org
        });
    } catch (error) {
        next(error);
    }
});

// Get organization by slug (public)
orgRoutes.get('/:slug', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { slug } = req.params;
        const org = await OrgService.getOrgBySlug(slug as string);
        if (!org) {
            return res.status(404).json({ success: false, error: { message: 'Organization not found' } });
        }
        res.json({ success: true, data: org });
    } catch (error) {
        next(error);
    }
});

// Check if slug is available (public)
orgRoutes.get('/check-slug/:slug', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { slug } = req.params;
        const available = await OrgService.isSlugAvailable(slug as string);

        res.json({
            success: true,
            data: { available },
        });
    } catch (error) {
        next(error);
    }
});
