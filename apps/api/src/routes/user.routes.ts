import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '@avith/database';
import { updateUserProfileSchema } from '@avith/validators';
import { createError } from '../middleware/error.middleware.js';
import { verifySessionToken, extractBearerToken } from '../lib/jwt.js';
import { findOrCreateUser } from '../services/user.service.js';
import { authLimiter, createLogger } from '../lib/core.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const log = createLogger('UserRoutes');

export const userRoutes: Router = Router();

// Configure Multer for local storage
const uploadDir = path.join(process.cwd(), 'uploads');
// Ensure directory exists
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Use UUID to prevent filename guessing
        const ext = path.extname(file.originalname);
        cb(null, `${uuidv4()}${ext}`);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 1024 * 1024 // 1MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only images are allowed'));
        }
    }
});

interface AuthenticatedRequest extends Request {
    userId?: string;
    userEmail?: string;
}

// Serve profile images publicly
userRoutes.get('/image/:filename', (req: Request, res: Response) => {
    const filename = req.params.filename as string;

    // Prevent directory traversal
    const safeFilename = path.basename(filename);
    const filepath = path.join(uploadDir, safeFilename);

    console.log(`[Debug] Serving image: ${filename}`);
    console.log(`[Debug] Resolved path: ${filepath}`);
    console.log(`[Debug] Exists: ${fs.existsSync(filepath)}`);

    if (fs.existsSync(filepath)) {
        res.sendFile(filepath);
    } else {
        res.status(404).json({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Image not found' }
        });
    }
});

// JWT-based auth middleware for user routes (no org context)
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

// Public route for secure image delivery (needs auth check but logic handles it)
// We mount this BEFORE the general jwtAuth if we want custom handling, 
// BUT we want to ensure only logged in users can see images.
// So we keep it under jwtAuth protection? 
// Yes, the requirement is "user need to be logged in".
// So we can just put it here.
userRoutes.use(jwtAuth);

// Upload profile image
userRoutes.post('/image', upload.single('image'), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: { code: 'BAD_REQUEST', message: 'No image file provided' }
            });
        }

        // Fetch current user to check for existing image
        const currentUser = await prisma.user.findUnique({
            where: { id: req.userId },
            select: { avatarUrl: true }
        });

        // Cleanup old image if it exists and is a local file
        if (currentUser?.avatarUrl && currentUser.avatarUrl.includes('/api/users/image/')) {
            const oldFilename = path.basename(currentUser.avatarUrl);
            const oldFilepath = path.join(uploadDir, oldFilename);
            if (fs.existsSync(oldFilepath)) {
                try {
                    fs.unlinkSync(oldFilepath);
                    log.info('Deleted old profile image', { userId: req.userId, filename: oldFilename });
                } catch (err) {
                    log.error('Failed to delete old profile image', { error: err });
                }
            }
        }

        // Generate the secure URL (pointing to our secure serve endpoint)
        // Adjust protocol/host as needed, or return relative path
        // For now, returning relative path /api/users/image/filename
        const imageUrl = `/api/users/image/${req.file.filename}`;

        const updatedUser = await prisma.user.update({
            where: { id: req.userId },
            data: { avatarUrl: imageUrl },
            select: {
                id: true,
                name: true,
                avatarUrl: true
            }
        });

        res.json({ success: true, data: updatedUser });
    } catch (error) {
        next(error);
    }
});

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

        const orgs = user.memberships.map((m: any) => ({
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
        // Always fetch fresh from DB
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
            organizations: user.memberships.map((m: any) => ({
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
                createdAt: true,
            },
        });

        res.json({ success: true, data: updatedUser });
    } catch (error) {
        next(error);
    }
});
