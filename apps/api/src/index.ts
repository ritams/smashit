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

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
}));
app.use(express.json());

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
        // Start booking queue worker
        await startBookingWorker();
        console.log('📦 Booking worker started');
        console.log('📦 Server restarting...');

        app.listen(PORT, () => {
            console.log(`🚀 API server running on http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

start();
