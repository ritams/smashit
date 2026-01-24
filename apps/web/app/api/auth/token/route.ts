import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Returns the raw JWT token for the current session
 * This allows the frontend to send the token to the backend API
 */
export async function GET(request: NextRequest) {
    console.log('[Auth Token Route] Fetching token...');
    const token = await getToken({
        req: request,
        secret: process.env.NEXTAUTH_SECRET,
        raw: true, // Get raw JWT string instead of decoded payload
    });

    if (!token) {
        console.warn('[Auth Token Route] No token found in request cookies');
        // List cookies for debugging (safe because we don't log values)
        const cookieNames = request.cookies.getAll().map(c => c.name);
        console.log('[Auth Token Route] Available cookies:', cookieNames);
        return NextResponse.json({ token: null }, { status: 401 });
    }

    console.log('[Auth Token Route] Token successfully retrieved');
    return NextResponse.json({ token });
}
