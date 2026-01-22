import { jwtDecrypt } from 'jose';
import { hkdf } from '@panva/hkdf';
import { createLogger } from './core.js';

const log = createLogger('JWT');

export interface JWTUser {
    email: string;
    name: string;
    picture?: string;
    sub: string; // Google ID
}

/**
 * Derive encryption key the same way NextAuth v4 does
 * NextAuth uses HKDF to derive a 32-byte key from NEXTAUTH_SECRET for A256GCM
 */
async function getDerivedEncryptionKey(secret: string): Promise<Uint8Array> {
    return await hkdf(
        'sha256',
        secret,
        '',
        'NextAuth.js Generated Encryption Key',
        32 // A256GCM requires 32 bytes (256 bits)
    );
}

// Cache the encryption key to avoid re-deriving on every request (expensive HKDF)
let cachedEncryptionKey: Uint8Array | null = null;

/**
 * Verify next-auth JWT token and extract user info
 * NextAuth v4 encrypts tokens using JWE with A256CBC-HS512
 */
export async function verifySessionToken(token: string): Promise<JWTUser | null> {
    const secret = process.env.NEXTAUTH_SECRET;

    if (!secret) {
        log.error('NEXTAUTH_SECRET not configured - cannot verify tokens');
        return null;
    }

    try {
        // Use cached key if available, otherwise derive and cache
        if (!cachedEncryptionKey) {
            cachedEncryptionKey = await getDerivedEncryptionKey(secret);
        }

        const { payload } = await jwtDecrypt(token, cachedEncryptionKey, {
            clockTolerance: 15, // 15 seconds tolerance
        });

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
        log.warn('Token verification failed', { error: (err as Error).message, stack: (err as Error).stack?.split('\n')[1] });
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
