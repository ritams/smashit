import express from 'express';
import cors from 'cors';
import { orgRoutes } from './routes/org.routes.js';
import { userRoutes } from './routes/user.routes.js';
import { spaceRoutes } from './routes/space.routes.js';
import { bookingRoutes } from './routes/booking.routes.js';
import { adminRoutes } from './routes/admin.routes.js';
import { facilityRoutes } from './routes/facility.routes.js';
import { sseRoutes } from './routes/sse.routes.js';
import { uploadRoutes } from './routes/upload.routes.js';
import { errorHandler } from './middleware/error.middleware.js';
import { requestLogger } from './middleware/request-logger.middleware.js';
import { startBookingWorker } from './workers/booking.worker.js';
import { validateEnv, generalLimiter, createLogger } from './lib/core.js';
import { createError } from './middleware/error.middleware.js';

const log = createLogger('Server');
const app = express();
const PORT = process.env.PORT || 4000;

// Validate environment on startup
validateEnv();

// Middleware
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000').split(',').map(o => o.trim());
log.info('Configured CORS Origins', { origins: allowedOrigins });

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            log.warn('CORS Blocked Request', {
                origin,
                allowedOrigins,
                method: 'UNKNOWN' // Method isn't available in this callback easily without closure
            });
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
}));
app.use(express.json());

// Request logging (adds correlation IDs and timing)
app.use(requestLogger);

// Apply general rate limiting to all routes
app.use(generalLimiter);

// Health check (excluded from logging for noise reduction)
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        correlationId: (req as any).correlationId,
    });
});

// Routes
app.use('/api/users', userRoutes);
app.use('/api/orgs/:slug/spaces', spaceRoutes);
app.use('/api/orgs/:slug/bookings', bookingRoutes);
app.use('/api/orgs/:slug/admin', adminRoutes);
app.use('/api/orgs/:slug/facilities', facilityRoutes);
app.use('/api/orgs', orgRoutes);
app.use('/api/events', sseRoutes);
app.use('/api/uploads', uploadRoutes);

// 404 Handler
app.use((_req, _res, next) => {
    next(createError('Route not found', 404, 'NOT_FOUND'));
});

// Error handler
app.use(errorHandler);

// Start server and worker
async function start() {
    try {
        await startBookingWorker();
        log.info('Booking worker started');

        app.listen(PORT, () => {
            log.info(`API server running on http://localhost:${PORT}`);
        });
    } catch (error) {
        log.error('Failed to start server', { error: (error as Error).message });
        process.exit(1);
    }
}

start();
