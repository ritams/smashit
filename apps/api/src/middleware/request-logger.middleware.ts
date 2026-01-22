import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { createLogger } from '../lib/core.js';

const log = createLogger('HTTP');

/**
 * Extend Express Request type with correlation ID and timing
 */
declare global {
    namespace Express {
        interface Request {
            correlationId: string;
            startTime: number;
            log: ReturnType<typeof createLogger>;
        }
    }
}

/**
 * Request Logger Middleware
 * - Adds correlation ID for request tracing
 * - Logs incoming requests and outgoing responses
 * - Measures request duration
 * - Creates a child logger with request context
 */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
    // Generate or use existing correlation ID
    req.correlationId = (req.headers['x-correlation-id'] as string) || crypto.randomUUID().slice(0, 8);
    req.startTime = performance.now();

    // Create a child logger with request context
    req.log = createLogger('Request', { correlationId: req.correlationId });

    // Log incoming request (SECURITY: filter sensitive query params)
    const sanitizedQuery = Object.keys(req.query).length > 0
        ? Object.fromEntries(
            Object.entries(req.query).filter(([key]) =>
                !['token', 'password', 'secret', 'key', 'apikey', 'api_key'].includes(key.toLowerCase())
            )
        )
        : undefined;

    log.request(req.method, req.path, {
        correlationId: req.correlationId,
        ip: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent']?.slice(0, 60),
        query: Object.keys(sanitizedQuery || {}).length > 0 ? sanitizedQuery : undefined,
    });

    // Log response when finished
    res.on('finish', () => {
        const duration = Math.round(performance.now() - req.startTime);
        log.response(req.method, req.path, res.statusCode, duration, {
            correlationId: req.correlationId,
            contentLength: res.get('content-length'),
        });
    });

    // Set correlation ID in response header for debugging
    res.setHeader('X-Correlation-ID', req.correlationId);

    next();
}
