import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '@smashit/database';
import { createOrganizationSchema } from '@smashit/validators';
import { findOrCreateUser } from '../services/user.service.js';
import { verifySessionToken, extractBearerToken } from '../lib/jwt.js';
import { authLimiter, createLogger } from '../lib/core.js';

const log = createLogger('OrgRoutes');

export const orgRoutes: Router = Router();

// Get organization by slug (public)
orgRoutes.get('/:slug', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { slug } = req.params;

        const org = await prisma.organization.findUnique({
            where: { slug: slug as string },
            select: {
                id: true,
                name: true,
                slug: true,
                timezone: true,
                settings: true,
            },
        });

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
orgRoutes.post('/', authLimiter, async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Verify JWT token
        const token = extractBearerToken(req.headers.authorization);
        let userEmail: string | undefined;
        let userName: string | undefined;
        let userGoogleId: string | undefined;
        let userAvatar: string | undefined;

        if (token) {
            const jwtUser = await verifySessionToken(token);
            if (jwtUser) {
                userEmail = jwtUser.email;
                userName = jwtUser.name;
                userGoogleId = jwtUser.sub;
                userAvatar = jwtUser.picture;
            }
        }

        // Fallback for dev mode
        if (!userEmail && process.env.ALLOW_HEADER_AUTH === 'true') {
            userEmail = req.headers['x-user-email'] as string;
            userName = req.headers['x-user-name'] as string;
            userGoogleId = req.headers['x-user-google-id'] as string;
            userAvatar = req.headers['x-user-avatar'] as string;
        }

        if (!userEmail) {
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

        const data = parseResult.data;

        // Check if slug already exists
        const existing = await prisma.organization.findUnique({
            where: { slug: data.slug },
        });

        if (existing) {
            return res.status(400).json({
                success: false,
                error: { code: 'SLUG_TAKEN', message: 'This URL is already taken' },
            });
        }

        // Use shared user service
        const user = await findOrCreateUser({
            email: userEmail,
            name: userName,
            googleId: userGoogleId,
            avatarUrl: userAvatar,
        });

        // Create organization
        const org = await prisma.organization.create({
            data: {
                name: data.name,
                slug: data.slug,
                timezone: data.timezone || 'Asia/Kolkata',
            },
        });

        // Create membership as ADMIN
        await prisma.membership.create({
            data: {
                userId: user.id,
                orgId: org.id,
                role: 'ADMIN',
            },
        });

        res.status(201).json({
            success: true,
            data: {
                ...org,
                role: 'ADMIN',
            },
        });
    } catch (error) {
        log.error('Error creating org', { error: (error as Error).message });
        next(error);
    }
});

// Check if slug is available (public)
orgRoutes.get('/check-slug/:slug', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { slug } = req.params;

        const existing = await prisma.organization.findUnique({
            where: { slug: slug as string },
            select: { id: true },
        });

        res.json({
            success: true,
            data: { available: !existing },
        });
    } catch (error) {
        next(error);
    }
});
