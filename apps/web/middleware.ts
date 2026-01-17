import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
    const path = request.nextUrl.pathname;

    // Public paths that don't require authentication
    const publicPaths = ['/', '/create-org', '/api/auth'];

    // Check if the path is public
    const isPublicPath = publicPaths.some(
        (publicPath) => path === publicPath || path.startsWith(`${publicPath}/`)
    );

    // Org login pages are public
    if (path.match(/^\/org\/[^/]+\/login$/)) {
        return NextResponse.next();
    }

    // Get the token
    const token = await getToken({
        req: request,
        secret: process.env.NEXTAUTH_SECRET,
    });

    // If it's a public path, allow access
    if (isPublicPath) {
        return NextResponse.next();
    }

    // If no token and trying to access protected routes, redirect to home
    if (!token) {
        // If trying to access org pages, redirect to org login
        if (path.match(/^\/org\/[^/]+\//)) {
            const orgSlug = path.split('/')[2];
            return NextResponse.redirect(new URL(`/org/${orgSlug}/login`, request.url));
        }
        // Otherwise redirect to home
        return NextResponse.redirect(new URL('/', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
