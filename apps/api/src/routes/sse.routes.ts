import { Router, Request, Response } from 'express';
import { prisma } from '@smashit/database';
import { addSSEConnection, removeSSEConnection } from '../services/sse.service.js';

export const sseRoutes: Router = Router();

// SSE endpoint for real-time updates
sseRoutes.get('/', async (req: Request, res: Response) => {
    const { orgSlug } = req.query;

    if (!orgSlug || typeof orgSlug !== 'string') {
        return res.status(400).json({
            success: false,
            error: { code: 'MISSING_ORG', message: 'orgSlug query parameter is required' },
        });
    }

    // Verify org exists
    const org = await prisma.organization.findUnique({
        where: { slug: orgSlug },
        select: { id: true },
    });

    if (!org) {
        return res.status(404).json({
            success: false,
            error: { code: 'ORG_NOT_FOUND', message: 'Organization not found' },
        });
    }

    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

    // Send initial connection message
    res.write(`data: ${JSON.stringify({ type: 'CONNECTED', payload: { orgSlug } })}\n\n`);

    // Add to connections
    addSSEConnection(org.id, res);

    // Keep connection alive with periodic heartbeats
    const heartbeat = setInterval(() => {
        res.write(': heartbeat\n\n');
    }, 30000);

    // Handle client disconnect - single handler for cleanup
    req.on('close', () => {
        removeSSEConnection(org.id, res);
        clearInterval(heartbeat);
    });
});
