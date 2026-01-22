import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { createLogger } from '../lib/core.js';

const log = createLogger('Error');

export interface ApiError extends Error {
    statusCode?: number;
    code?: string;
}

export function errorHandler(
    err: ApiError,
    req: Request,
    res: Response,
    _next: NextFunction
) {
    const correlationId = (req as any).correlationId;
    const statusCode = err.statusCode || 500;
    const code = err.code || 'INTERNAL_ERROR';
    const message = err.message || 'An unexpected error occurred';

    // Log with full context
    log.error(message, {
        code,
        statusCode,
        correlationId,
        path: req.path,
        method: req.method,
        stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
    });

    if (err instanceof ZodError) {
        return res.status(400).json({
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: 'Validation failed',
                details: err.errors,
                correlationId,
            },
        });
    }

    res.status(statusCode).json({
        success: false,
        error: {
            code,
            message,
            correlationId,
        },
    });
}

export function createError(message: string, statusCode: number, code: string): ApiError {
    const error = new Error(message) as ApiError;
    error.statusCode = statusCode;
    error.code = code;
    return error;
}

