import { Router } from 'express';
import { prisma } from '@smashit/database';
import { createOrganizationSchema } from '@smashit/validators';

export const orgRoutes = Router();

// Get organization by slug
orgRoutes.get('/:slug', async (req, res, next) => {
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

// Create new organization (public signup)
orgRoutes.post('/', async (req, res, next) => {
    try {
        const data = createOrganizationSchema.parse(req.body);

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

        const org = await prisma.organization.create({
            data: {
                name: data.name,
                slug: data.slug,
                timezone: data.timezone,
            },
        });

        res.status(201).json({ success: true, data: org });
    } catch (error) {
        next(error);
    }
});

// Check if slug is available
orgRoutes.get('/check-slug/:slug', async (req, res, next) => {
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
