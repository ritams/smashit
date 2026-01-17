import express from 'express';
import cors from 'cors';
import { orgRoutes } from './routes/org.routes.js';
import { userRoutes } from './routes/user.routes.js';
import { spaceRoutes } from './routes/space.routes.js';
import { bookingRoutes } from './routes/booking.routes.js';
import { adminRoutes } from './routes/admin.routes.js';
import { sseRoutes } from './routes/sse.routes.js';
import { errorHandler } from './middleware/error.middleware.js';
import { startBookingWorker } from './workers/booking.worker.js';
import { validateEnv, generalLimiter, createLogger } from './lib/core.js';

const log = createLogger('Server');
const app = express();
const PORT = process.env.PORT || 4000;

// Validate environment on startup
validateEnv();

// Middleware
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
}));
app.use(express.json());

// Apply general rate limiting to all routes
app.use(generalLimiter);

// Health check
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/users', userRoutes);
app.use('/api/orgs', orgRoutes);
app.use('/api/orgs/:slug/spaces', spaceRoutes);
app.use('/api/orgs/:slug/bookings', bookingRoutes);
app.use('/api/orgs/:slug/admin', adminRoutes);
app.use('/api/events', sseRoutes);

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

