import { Router, Request, Response, NextFunction } from 'express';
import { createOrganizationSchema } from '@smashit/validators';
import { OrgService } from '../services/org.service.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware.js';
import { authLimiter, createLogger } from '../lib/core.js';

const log = createLogger('OrgRoutes');

export const orgRoutes: Router = Router();

// Get organization by slug (public)
orgRoutes.get('/:slug', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { slug } = req.params;

        const org = await OrgService.getOrgBySlug(slug as string);

        if (!org) {
            return res.status(404).json({
                success: false,
                error: { code: 'ORG_NOT_FOUND', message: 'Organization not found' },
            });
        }

        res.json({ success: true, data: org });
    } catch (error) {
        next(error);
    }
});

// Create new organization (requires authentication)
orgRoutes.post('/', authLimiter, authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: { code: 'UNAUTHORIZED', message: 'Must be logged in to create an organization' },
            });
        }

        const parseResult = createOrganizationSchema.safeParse(req.body);
        if (!parseResult.success) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: parseResult.error.errors.map((e: { path: (string | number)[]; message: string }) => `${e.path}: ${e.message}`).join(', '),
                },
            });
        }

        try {
            const org = await OrgService.createOrg(parseResult.data, req.user!.id);
            res.status(201).json({
                success: true,
                data: org,
            });
        } catch (err: any) {
            if (err.message === 'SLUG_TAKEN') {
                return res.status(400).json({
                    success: false,
                    error: { code: 'SLUG_TAKEN', message: 'This URL is already taken' },
                });
            }
            throw err;
        }
    } catch (error) {
        log.error('Error creating org', { error: (error as Error).message });
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
