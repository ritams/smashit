import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '@smashit/database';
import { addSSEConnection, removeSSEConnection } from '../services/sse.service.js';
import { sseLimiter, createLogger } from '../lib/core.js';
import { verifySessionToken, extractBearerToken } from '../lib/jwt.js';

const log = createLogger('SSERoutes');

export const sseRoutes: Router = Router();

// Apply rate limiting to SSE connections
sseRoutes.use(sseLimiter);

// Query param validation
const sseQuerySchema = z.object({
    orgSlug: z.string().min(1),
    token: z.string().optional(), // Token can be passed as query param for EventSource
});

// SSE endpoint for real-time updates
sseRoutes.get('/', async (req: Request, res: Response) => {
    // Validate query params
    const queryResult = sseQuerySchema.safeParse(req.query);
    if (!queryResult.success) {
        return res.status(400).json({
            success: false,
            error: { code: 'INVALID_PARAMS', message: 'orgSlug query parameter is required' },
        });
    }
    const { orgSlug, token: queryToken } = queryResult.data;

    // Try to get token from Authorization header first, then from query param
    // (EventSource doesn't support custom headers, so query param is needed)
    const headerToken = extractBearerToken(req.headers.authorization);
    const token = headerToken || queryToken;

    let isAuthenticated = false;
    let userEmail: string | undefined;

    if (token) {
        const jwtUser = await verifySessionToken(token);
        if (jwtUser) {
            isAuthenticated = true;
            userEmail = jwtUser.email;
            log.debug('SSE authenticated via token', { email: userEmail });
        }
    }

    if (!isAuthenticated) {
        return res.status(401).json({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Authentication required for real-time updates' },
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
    log.debug('SSE client connected', { orgSlug, userEmail });

    // Keep connection alive with periodic heartbeats
    const heartbeat = setInterval(() => {
        res.write(': heartbeat\n\n');
    }, 15000);

    // Handle client disconnect
    req.on('close', () => {
        removeSSEConnection(org.id, res);
        clearInterval(heartbeat);
    });
});


