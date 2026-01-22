import { rateLimit } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import Redis from 'ioredis';

/**
 * Enhanced Logger with comprehensive features:
 * - Colorized output in development
 * - Structured JSON in production
 * - Correlation ID support
 * - Request/response logging helpers
 * - Performance timing utilities
 */

export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
}

interface LogMeta {
    correlationId?: string;
    userId?: string;
    orgId?: string;
    durationMs?: number;
    [key: string]: unknown;
}

const LOG_LEVEL = (process.env.LOG_LEVEL?.toUpperCase() as keyof typeof LogLevel) || 'INFO';
const IS_DEV = process.env.NODE_ENV !== 'production';

// ANSI color codes for dev environment
const colors = {
    DEBUG: '\x1b[36m',  // Cyan
    INFO: '\x1b[32m',   // Green
    WARN: '\x1b[33m',   // Yellow
    ERROR: '\x1b[31m',  // Red
    RESET: '\x1b[0m',
    DIM: '\x1b[2m',
    BOLD: '\x1b[1m',
};

class Logger {
    private level: LogLevel;
    private context?: string;
    private meta: LogMeta;

    constructor(context?: string, meta: LogMeta = {}) {
        this.level = LogLevel[LOG_LEVEL] ?? LogLevel.INFO;
        this.context = context;
        this.meta = meta;
    }

    private format(level: keyof typeof LogLevel, message: string, meta?: object): string {
        const timestamp = new Date().toISOString();
        const ctx = this.context ? `[${this.context}]` : '';
        const allMeta = { ...this.meta, ...meta };

        // Remove undefined values
        Object.keys(allMeta).forEach(key => {
            if (allMeta[key] === undefined) delete allMeta[key];
        });

        const hasMetadata = Object.keys(allMeta).length > 0;

        if (IS_DEV) {
            const color = colors[level];
            const metaStr = hasMetadata ? ` ${colors.DIM}${JSON.stringify(allMeta)}${colors.RESET}` : '';
            return `${colors.DIM}${timestamp}${colors.RESET} ${color}${colors.BOLD}${level.padEnd(5)}${colors.RESET} ${ctx} ${message}${metaStr}`;
        }

        // Structured JSON for production
        return JSON.stringify({
            timestamp,
            level,
            context: this.context,
            message,
            ...allMeta,
        });
    }

    debug(message: string, meta?: object) {
        if (this.level <= LogLevel.DEBUG) {
            console.debug(this.format('DEBUG', message, meta));
        }
    }

    info(message: string, meta?: object) {
        if (this.level <= LogLevel.INFO) {
            console.info(this.format('INFO', message, meta));
        }
    }

    warn(message: string, meta?: object) {
        if (this.level <= LogLevel.WARN) {
            console.warn(this.format('WARN', message, meta));
        }
    }

    error(message: string, meta?: object) {
        if (this.level <= LogLevel.ERROR) {
            console.error(this.format('ERROR', message, meta));
        }
    }

    /**
     * Create a child logger with additional context
     */
    child(context: string, meta: LogMeta = {}): Logger {
        const fullContext = this.context ? `${this.context}:${context}` : context;
        return new Logger(fullContext, { ...this.meta, ...meta });
    }

    /**
     * Log an incoming request
     */
    request(method: string, path: string, meta?: object) {
        this.info(`→ ${method} ${path}`, meta);
    }

    /**
     * Log an outgoing response with status and timing
     */
    response(method: string, path: string, status: number, durationMs: number, meta?: object) {
        const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';
        const statusColor = IS_DEV ? (status >= 500 ? colors.ERROR : status >= 400 ? colors.WARN : colors.INFO) : '';
        const resetColor = IS_DEV ? colors.RESET : '';
        this[level](`← ${method} ${path} ${statusColor}${status}${resetColor} ${durationMs}ms`, meta);
    }

    /**
     * Create a timing function for performance measurement
     * Returns a function that when called logs the elapsed time
     */
    time(label: string): () => number {
        const start = performance.now();
        return () => {
            const duration = Math.round(performance.now() - start);
            this.debug(`⏱ ${label}`, { durationMs: duration });
            return duration;
        };
    }

    /**
     * Log a database query (for debugging)
     */
    query(operation: string, model: string, meta?: object) {
        this.debug(`DB ${operation} ${model}`, meta);
    }
}

// Export singleton and factory
export const logger = new Logger();
export const createLogger = (context: string, meta: LogMeta = {}) => new Logger(context, meta);

/**
 * Unified Redis Client
 * Single client instance used throughout the application
 */
export const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    lazyConnect: true,
    maxRetriesPerRequest: null, // Required for BullMQ
    retryStrategy: (times) => {
        if (times > 3) {
            logger.warn('Redis connection failed, falling back to memory', { attempt: times });
            return null;
        }
        return Math.min(times * 100, 2000);
    },
});

redis.on('error', (err) => logger.warn('Redis error', { error: err.message }));
redis.on('connect', () => logger.info('Redis connected'));

// Alias for backward compatibility with rate-limit-redis
export const redisClient = redis;

/**
 * Rate Limiting Middleware Factory
 */
function createRateLimiter(options: {
    max: number;
    prefix: string;
    message: string;
    windowMs?: number;
}) {
    return rateLimit({
        windowMs: options.windowMs || 60 * 1000, // Default: 1 minute
        max: options.max,
        message: {
            success: false,
            error: { code: 'RATE_LIMIT_EXCEEDED', message: options.message },
        },
        standardHeaders: true,
        legacyHeaders: false,
        store: process.env.REDIS_URL ? new RedisStore({
            // @ts-expect-error - ioredis call signature mismatch with rate-limit-redis
            sendCommand: (...args: string[]) => redis.call(...args),
            prefix: options.prefix,
        }) : undefined,
    });
}

// Rate limiters
export const generalLimiter = createRateLimiter({
    max: 100,
    prefix: 'rl:general:',
    message: 'Too many requests, please try again later',
});

export const authLimiter = createRateLimiter({
    max: 20,
    prefix: 'rl:auth:',
    message: 'Too many authentication attempts',
});

export const bookingLimiter = createRateLimiter({
    max: 30,
    prefix: 'rl:booking:',
    message: 'Too many booking attempts',
});

export const sseLimiter = createRateLimiter({
    max: 30,
    prefix: 'rl:sse:',
    message: 'Too many connections',
});

// Admin mutation limiter - stricter limits
export const adminLimiter = createRateLimiter({
    max: 15,
    prefix: 'rl:admin:',
    message: 'Too many admin operations',
});

/**
 * Environment variable validation
 */
export function validateEnv(): void {
    const log = createLogger('Env');
    const required = ['DATABASE_URL', 'NEXTAUTH_SECRET'];
    const missing = required.filter((key) => !process.env[key]);

    if (missing.length > 0) {
        log.error('Missing required environment variables', { missing });
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    const optional = ['REDIS_URL', 'CORS_ORIGIN', 'PORT', 'LOG_LEVEL', 'WORKER_CONCURRENCY'];
    const unset = optional.filter((key) => !process.env[key]);
    if (unset.length > 0) {
        log.warn('Optional env vars not set, using defaults', { unset });
    }

    log.info('Environment validated', {
        nodeEnv: process.env.NODE_ENV || 'development',
        logLevel: LOG_LEVEL,
        hasRedis: !!process.env.REDIS_URL,
    });
}
