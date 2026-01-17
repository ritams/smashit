import { Request, Response, NextFunction } from 'express';
import { prisma } from '@smashit/database';
import { createError } from './error.middleware.js';

export interface OrgRequest extends Request {
    org?: {
        id: string;
        slug: string;
        timezone: string;
    };
}

export async function orgMiddleware(
    req: OrgRequest,
    _res: Response,
    next: NextFunction
) {
    try {
        const slug = req.params.slug;

        if (!slug) {
            throw createError('Organization slug is required', 400, 'MISSING_SLUG');
        }

        const org = await prisma.organization.findUnique({
            where: { slug: slug as string },
            select: { id: true, slug: true, timezone: true },
        });

        if (!org) {
            throw createError('Organization not found', 404, 'ORG_NOT_FOUND');
        }

        req.org = org;
        next();
    } catch (error) {
        next(error);
    }
}
