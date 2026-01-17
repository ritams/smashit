import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '@smashit/database';
import { z } from 'zod';

export const orgRoutes: Router = Router();

// Schema for org creation
const createOrgSchema = z.object({
    name: z.string().min(2).max(100),
    slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/),
    timezone: z.string().optional().default('Asia/Kolkata'),
});

// Get organization by slug (public)
orgRoutes.get('/:slug', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { slug } = req.params;

        const org = await prisma.organization.findUnique({
            where: { slug },
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

// Create new organization (requires logged in user)
orgRoutes.post('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userEmail = req.headers['x-user-email'] as string;
        const userName = req.headers['x-user-name'] as string;
        const userGoogleId = req.headers['x-user-google-id'] as string;
        const userAvatar = req.headers['x-user-avatar'] as string;

        if (!userEmail) {
            return res.status(401).json({
                success: false,
                error: { code: 'UNAUTHORIZED', message: 'Must be logged in to create an organization' },
            });
        }

        const parseResult = createOrgSchema.safeParse(req.body);
        if (!parseResult.success) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: parseResult.error.errors.map(e => `${e.path}: ${e.message}`).join(', '),
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

        // Find or create the user
        let user = await prisma.user.findUnique({
            where: { email: userEmail },
        });

        if (!user) {
            user = await prisma.user.create({
                data: {
                    email: userEmail,
                    name: userName || userEmail.split('@')[0],
                    googleId: userGoogleId || `google-${Date.now()}`,
                    avatarUrl: userAvatar || null,
                },
            });
        }

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
        console.error('Error creating org:', error);
        next(error);
    }
});

// Check if slug is available (public)
orgRoutes.get('/check-slug/:slug', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { slug } = req.params;

        const existing = await prisma.organization.findUnique({
            where: { slug },
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
