/**
 * Performance Tracking Middleware
 * Tracks response times and caches hit for monitoring
 */

import { NextRequest, NextResponse } from 'next/server';
import { performanceMonitor } from '@/lib/performance-monitor';
import { getRequestId } from '@/lib/request-context';

export function withPerformanceTracking(
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const requestId = getRequestId();
    const endpoint = req.nextUrl.pathname;
    const method = req.method;

    // Extract user ID from session if available
    let userId: string | undefined;
    try {
      const authHeader = req.headers.get('authorization');
      if (authHeader) {
        userId = authHeader.split(' ')[1];
      }
    } catch {}

    // Start tracking
    performanceMonitor.startTracking(requestId, endpoint, method, userId);

    try {
      // Call the handler
      const response = await handler(req);

      // End tracking with status code
      performanceMonitor.endTracking(requestId, response.status);

      // Add performance headers
      const metrics = performanceMonitor.getMetrics(requestId);
      if (metrics && metrics.duration) {
        const headers = new Headers(response.headers);
        headers.set('X-Response-Time-Ms', Math.round(metrics.duration).toString());
        headers.set('X-Cache-Hit', metrics.cacheHit ? 'true' : 'false');
        headers.set('X-Query-Count', metrics.queryCount.toString());

        return new NextResponse(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers,
        });
      }

      return response;
    } catch (error) {
      // Log error with tracking
      performanceMonitor.endTracking(requestId, 500);
      throw error;
    }
  };
}
