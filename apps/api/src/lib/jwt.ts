import { jwtVerify, JWTPayload } from 'jose';
import { createLogger } from './core.js';

const log = createLogger('JWT');

export interface JWTUser {
    email: string;
    name: string;
    picture?: string;
    sub: string; // Google ID
}

/**
 * Verify next-auth JWT token and extract user info
 * next-auth uses the same NEXTAUTH_SECRET for signing tokens
 */
export async function verifySessionToken(token: string): Promise<JWTUser | null> {
    const secret = process.env.NEXTAUTH_SECRET;

    if (!secret) {
        log.error('NEXTAUTH_SECRET not configured - cannot verify tokens');
        return null;
    }

    try {
        const secretKey = new TextEncoder().encode(secret);
        const { payload } = await jwtVerify(token, secretKey);

        // next-auth stores user info in the token
        if (!payload.email || typeof payload.email !== 'string') {
            log.warn('Token missing email claim');
            return null;
        }

        return {
            email: payload.email as string,
            name: (payload.name as string) || payload.email.split('@')[0],
            picture: payload.picture as string | undefined,
            sub: (payload.sub || payload.googleId) as string,
        };
    } catch (err) {
        log.debug('Token verification failed', { error: (err as Error).message });
        return null;
    }
}

/**
 * Extract Bearer token from Authorization header
 */
export function extractBearerToken(authHeader: string | undefined): string | null {
    if (!authHeader?.startsWith('Bearer ')) {
        return null;
    }
    return authHeader.slice(7);
}
