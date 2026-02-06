/**
 * Performance Optimization Middleware
 * Adds caching headers and request optimization for API routes
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Cache-Control header values
const CACHE_CONTROL_NO_CACHE = 'no-cache, no-store, must-revalidate';
const CACHE_CONTROL_SHORT = 'public, max-age=60, s-maxage=60';
const CACHE_CONTROL_LONG = 'public, max-age=3600, s-maxage=86400';

// Paths that should have long cache (static content)
const CACHEABLE_PATHS = [
    '/api/integrations/status',
];

// Paths that should have short cache
const SHORT_CACHE_PATHS = [
    '/api/meetings/past',
    '/api/meetings/upcoming',
];

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Skip middleware for non-API routes
    if (!pathname.startsWith('/api/')) {
        return NextResponse.next();
    }

    // Add performance headers
    const response = NextResponse.next();

    // Compression hint
    response.headers.set('Vary', 'Accept-Encoding');

    // Timing allow origin for performance measurement
    response.headers.set('Timing-Allow-Origin', '*');

    // Cache-Control headers based on path
    if (CACHEABLE_PATHS.some(path => pathname.startsWith(path))) {
        response.headers.set('Cache-Control', CACHE_CONTROL_LONG);
    } else if (SHORT_CACHE_PATHS.some(path => pathname.startsWith(path))) {
        response.headers.set('Cache-Control', CACHE_CONTROL_SHORT);
    } else {
        response.headers.set('Cache-Control', CACHE_CONTROL_NO_CACHE);
    }

    return response;
}

export const config = {
    matcher: '/api/:path*',
};
