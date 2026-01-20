import { rateLimit, Options } from 'express-rate-limit';

/**
 * Centralized Logger class for structured logging
 * Supports log levels and consistent formatting
 */
export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
}

const LOG_LEVEL = (process.env.LOG_LEVEL?.toUpperCase() as keyof typeof LogLevel) || 'INFO';

class Logger {
    private level: LogLevel;
    private context?: string;

    constructor(context?: string) {
        this.level = LogLevel[LOG_LEVEL] ?? LogLevel.INFO;
        this.context = context;
    }

    private format(level: string, message: string, meta?: object): string {
        const timestamp = new Date().toISOString();
        const ctx = this.context ? `[${this.context}]` : '';
        const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
        return `${timestamp} ${level} ${ctx} ${message}${metaStr}`;
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

    child(context: string): Logger {
        return new Logger(`${this.context ? this.context + ':' : ''}${context}`);
    }
}

// Export singleton and factory
export const logger = new Logger();
export const createLogger = (context: string) => new Logger(context);

/**
 * Rate limiting configurations
 */

// General API rate limit: 100 requests per minute
export const generalLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100,
    message: {
        success: false,
        error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests, please try again later' },
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Auth/sensitive endpoints: 20 requests per minute
export const authLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    message: {
        success: false,
        error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many authentication attempts' },
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Booking creation: 30 per minute to prevent spam
export const bookingLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    message: {
        success: false,
        error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many booking attempts' },
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// SSE connections: 30 per minute (high for robustness during flapping)
export const sseLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    message: {
        success: false,
        error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many connections' },
    },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Environment variable validation
 */
export function validateEnv(): void {
    const required = ['DATABASE_URL', 'NEXTAUTH_SECRET'];
    const missing = required.filter((key) => !process.env[key]);

    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    const optional = ['REDIS_URL', 'CORS_ORIGIN', 'PORT', 'LOG_LEVEL', 'ALLOW_HEADER_AUTH'];
    optional.forEach((key) => {
        if (!process.env[key]) {
            logger.warn(`Optional env var ${key} not set, using defaults`);
        }
    });
}
