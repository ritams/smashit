import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '@avith/database';
import { updateUserProfileSchema } from '@avith/validators';
import { createError } from '../middleware/error.middleware.js';
import { verifySessionToken, extractBearerToken } from '../lib/jwt.js';
import { findOrCreateUser } from '../services/user.service.js';
import { authLimiter, createLogger } from '../lib/core.js';

const log = createLogger('UserRoutes');

export const userRoutes: Router = Router();

interface AuthenticatedRequest extends Request {
    userId?: string;
    userEmail?: string;
}

/**
 * JWT-based auth middleware for user routes (no org context)
 */
async function jwtAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    const token = extractBearerToken(req.headers.authorization);

    if (!token) {
        log.warn('No token provided', { path: req.path });
        return res.status(401).json({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Valid token required' },
        });
    }

    const jwtUser = await verifySessionToken(token);
    if (!jwtUser) {
        return res.status(401).json({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        });
    }

    // Ensure user exists in database
    const user = await findOrCreateUser({
        email: jwtUser.email,
        name: jwtUser.name,
        googleId: jwtUser.sub,
        avatarUrl: jwtUser.picture,
    });

    req.userId = user.id;
    req.userEmail = user.email;
    next();
}

// Apply auth middleware and rate limiting
userRoutes.use(authLimiter);
userRoutes.use(jwtAuth);

// Get current user's organizations
userRoutes.get('/me/orgs', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.userId },
            include: {
                memberships: {
                    include: {
                        org: { select: { id: true, name: true, slug: true } },
                    },
                    orderBy: { createdAt: 'desc' },
                },
            },
        });

        if (!user) {
            return res.json({ success: true, data: [] });
        }

        const orgs = user.memberships.map((m) => ({
            id: m.org.id,
            name: m.org.name,
            slug: m.org.slug,
            role: m.role,
        }));

        res.json({ success: true, data: orgs });
    } catch (error) {
        next(error);
    }
});

// Get current user's profile
userRoutes.get('/me', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.userId },
            select: {
                id: true,
                email: true,
                name: true,
                avatarUrl: true,
                phoneNumber: true,
                registrationId: true,
                createdAt: true,
                memberships: {
                    include: {
                        org: { select: { id: true, name: true, slug: true } },
                    },
                    orderBy: { createdAt: 'desc' },
                },
            },
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                error: { code: 'USER_NOT_FOUND', message: 'User not found' },
            });
        }

        const profile = {
            ...user,
            organizations: user.memberships.map((m) => ({
                id: m.org.id,
                name: m.org.name,
                slug: m.org.slug,
                role: m.role,
            })),
        };

        res.json({ success: true, data: profile });
    } catch (error) {
        next(error);
    }
});

// Update current user's profile
userRoutes.patch('/me', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const { name, phoneNumber, registrationId } = updateUserProfileSchema.parse(req.body);

        const updatedUser = await prisma.user.update({
            where: { id: req.userId },
            data: {
                ...(name && { name }),
                ...(phoneNumber !== undefined && { phoneNumber }),
                ...(registrationId !== undefined && { registrationId }),
            },
            select: {
                id: true,
                email: true,
                name: true,
                avatarUrl: true,
                phoneNumber: true,
                registrationId: true,
            },
        });

        res.json({ success: true, data: updatedUser });
    } catch (error) {
        next(error);
    }
});


