import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Returns the raw JWT token for the current session
 * This allows the frontend to send the token to the backend API
 */
export async function GET(request: NextRequest) {
    const token = await getToken({
        req: request,
        secret: process.env.NEXTAUTH_SECRET,
        raw: true, // Get raw JWT string instead of decoded payload
    });

    if (!token) {
        return NextResponse.json({ token: null }, { status: 401 });
    }

    return NextResponse.json({ token });
}
