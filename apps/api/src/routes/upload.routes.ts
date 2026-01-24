import { Router, Request, Response, NextFunction } from 'express';
import { createError } from '../middleware/error.middleware.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { authLimiter, createLogger } from '../lib/core.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const log = createLogger('UploadRoutes');

export const uploadRoutes: Router = Router();

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
        fileSize: 5 * 1024 * 1024 // 5MB limit for general uploads
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only images are allowed'));
        }
    }
});

// Serve uploaded images
uploadRoutes.get('/image/:filename', (req: Request, res: Response) => {
    const filename = req.params.filename as string;

    // Prevent directory traversal
    const safeFilename = path.basename(filename);
    const filepath = path.join(uploadDir, safeFilename);

    if (fs.existsSync(filepath)) {
        res.sendFile(filepath);
    } else {
        res.status(404).json({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Image not found' }
        });
    }
});

// Serve uploaded images
uploadRoutes.get('/image/:filename', (req: Request, res: Response) => {
    const filename = req.params.filename as string;

    // Prevent directory traversal
    const safeFilename = path.basename(filename);
    const filepath = path.join(uploadDir, safeFilename);

    if (fs.existsSync(filepath)) {
        res.sendFile(filepath);
    } else {
        res.status(404).json({
            success: false,
            error: { code: 'NOT_FOUND', message: 'Image not found' }
        });
    }
});

// Apply auth middleware and rate limiting
uploadRoutes.use(authLimiter);
uploadRoutes.use(authMiddleware);

// Upload generic image
uploadRoutes.post('/', upload.single('image'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: { code: 'BAD_REQUEST', message: 'No image file provided' }
            });
        }

        // Return the secure URL pointing to the user image serve endpoint
        // Pass "public=true" or similar if we want to differentiate?
        // Actually, for now, we can reuse the user image serve endpoint if it just checks auth.
        // Or we can create a serve endpoint here too. 
        // Let's use /api/uploads/image/:filename

        const imageUrl = `/api/uploads/image/${req.file.filename}`;

        res.json({
            success: true,
            data: {
                url: imageUrl,
                filename: req.file.filename,
                mimetype: req.file.mimetype,
                size: req.file.size
            }
        });
    } catch (error) {
        next(error);
    }
});


