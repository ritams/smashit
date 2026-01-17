import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Paths that don't require authentication
const publicPaths = ['/login', '/signup', '/api/auth'];

export async function middleware(request: NextRequest) {
    const { pathname, hostname } = request.nextUrl;

    // Extract subdomain (for production)
    // In development, we use query params or path-based routing
    let orgSlug: string | null = null;

    // Check for subdomain in production
    const host = request.headers.get('host') || '';
    const parts = host.split('.');

    if (parts.length >= 3 && !['www', 'app'].includes(parts[0])) {
        orgSlug = parts[0];
    }

    // For development, extract from pathname like /org/[slug]
    const orgPathMatch = pathname.match(/^\/org\/([^/]+)/);
    if (orgPathMatch) {
        orgSlug = orgPathMatch[1];
    }

    // Skip middleware for public paths and API routes
    if (publicPaths.some((p) => pathname.startsWith(p))) {
        return NextResponse.next();
    }

    // Check auth for protected routes
    const token = await getToken({ req: request });

    if (!token) {
        const loginUrl = new URL('/login', request.url);
        if (orgSlug) {
            loginUrl.searchParams.set('org', orgSlug);
        }
        return NextResponse.redirect(loginUrl);
    }

    // Check admin routes
    if (pathname.includes('/admin')) {
        // TODO: Check if user is admin for this org
        // For now, allow all authenticated users
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public folder
         */
        '/((?!_next/static|_next/image|favicon.ico|public).*)',
    ],
};
