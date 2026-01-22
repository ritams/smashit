import { Request, Response, NextFunction } from 'express';
import { prisma } from '@smashit/database';
import { createError } from './error.middleware.js';
import { OrgService } from '../services/org.service.js';

export interface OrgRequest extends Request {
    org?: {
        id: string;
        slug: string;
        timezone: string;
        allowedDomains: string[];
        allowedEmails: string[];
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

        // Use cached service method
        const org = await OrgService.getOrgBySlug(slug as string);

        if (!org) {
            throw createError('Organization not found', 404, 'ORG_NOT_FOUND');
        }

        req.org = org;
        next();
    } catch (error) {
        next(error);
    }
}
