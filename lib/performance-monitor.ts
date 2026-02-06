/**
 * Performance Monitoring System
 * Tracks API response times, query durations, and system metrics
 */

import { logger } from '@/lib/logger';

export interface PerformanceMetrics {
  requestId: string;
  endpoint: string;
  method: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  statusCode?: number;
  cacheHit: boolean;
  queryCount: number;
  userId?: string;
  timestamp: Date;
  slowQuery: boolean;
  memoryUsed?: number;
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetrics> = new Map();
  private slowQueryThreshold = 200; // ms
  private slowEndpointThreshold = 1000; // ms
  private metricsBuffer: PerformanceMetrics[] = [];
  private bufferSize = 100;

  /**
   * Start tracking a request
   */
  startTracking(
    requestId: string,
    endpoint: string,
    method: string,
    userId?: string
  ): PerformanceMetrics {
    const metric: PerformanceMetrics = {
      requestId,
      endpoint,
      method,
      startTime: performance.now(),
      cacheHit: false,
      queryCount: 0,
      userId,
      timestamp: new Date(),
      slowQuery: false,
    };

    this.metrics.set(requestId, metric);
    return metric;
  }

  /**
   * Record cache hit
   */
  recordCacheHit(requestId: string): void {
    const metric = this.metrics.get(requestId);
    if (metric) {
      metric.cacheHit = true;
    }
  }

  /**
   * Increment query count
   */
  incrementQueryCount(requestId: string): void {
    const metric = this.metrics.get(requestId);
    if (metric) {
      metric.queryCount++;
    }
  }

  /**
   * Record query duration (marks as slow if needed)
   */
  recordQueryDuration(requestId: string, duration: number): void {
    const metric = this.metrics.get(requestId);
    if (metric && duration > this.slowQueryThreshold) {
      metric.slowQuery = true;
      logger.warn({
        message: 'Slow query detected',
        requestId,
        duration,
        threshold: this.slowQueryThreshold,
        endpoint: metric.endpoint,
      });
    }
  }

  /**
   * End tracking and calculate metrics
   */
  endTracking(requestId: string, statusCode: number): PerformanceMetrics | null {
    const metric = this.metrics.get(requestId);
    if (!metric) {
      return null;
    }

    metric.endTime = performance.now();
    metric.duration = metric.endTime - metric.startTime;
    metric.statusCode = statusCode;
    metric.memoryUsed = process.memoryUsage().heapUsed;

    // Log slow endpoints
    if (metric.duration > this.slowEndpointThreshold) {
      logger.warn({
        message: 'Slow endpoint detected',
        requestId,
        endpoint: metric.endpoint,
        duration: metric.duration,
        threshold: this.slowEndpointThreshold,
        statusCode,
        queryCount: metric.queryCount,
        cacheHit: metric.cacheHit,
      });
    }

    // Add to buffer
    this.metricsBuffer.push(metric);

    // Log to performance system if buffer is full
    if (this.metricsBuffer.length >= this.bufferSize) {
      this.flushMetrics();
    }

    // Clean up old metrics
    this.metrics.delete(requestId);

    return metric;
  }

  /**
   * Flush buffered metrics to logger
   */
  private flushMetrics(): void {
    if (this.metricsBuffer.length === 0) {
      return;
    }

    const averageDuration =
      this.metricsBuffer.reduce((sum, m) => sum + (m.duration || 0), 0) /
      this.metricsBuffer.length;
    const cacheHits = this.metricsBuffer.filter((m) => m.cacheHit).length;
    const slowEndpoints = this.metricsBuffer.filter(
      (m) => (m.duration || 0) > this.slowEndpointThreshold
    ).length;

    logger.info({
      message: 'Performance metrics batch',
      count: this.metricsBuffer.length,
      averageDuration: Math.round(averageDuration),
      cacheHitRate: Math.round((cacheHits / this.metricsBuffer.length) * 100),
      slowEndpoints,
    });

    this.metricsBuffer = [];
  }

  /**
   * Get metrics for a specific request
   */
  getMetrics(requestId: string): PerformanceMetrics | null {
    return this.metrics.get(requestId) || null;
  }

  /**
   * Get all active metrics
   */
  getAllMetrics(): PerformanceMetrics[] {
    return Array.from(this.metrics.values());
  }

  /**
   * Get performance statistics
   */
  getStatistics() {
    const allMetrics = this.getAllMetrics();

    if (allMetrics.length === 0) {
      return {
        count: 0,
        averageDuration: 0,
        minDuration: 0,
        maxDuration: 0,
        p95Duration: 0,
        p99Duration: 0,
        cacheHitRate: 0,
        slowEndpoints: 0,
      };
    }

    const durations = allMetrics
      .map((m) => m.duration || 0)
      .sort((a, b) => a - b);

    const cacheHits = allMetrics.filter((m) => m.cacheHit).length;
    const slowEndpoints = durations.filter(
      (d) => d > this.slowEndpointThreshold
    ).length;

    return {
      count: allMetrics.length,
      averageDuration: Math.round(
        durations.reduce((a, b) => a + b, 0) / durations.length
      ),
      minDuration: Math.round(durations[0]),
      maxDuration: Math.round(durations[durations.length - 1]),
      p95Duration: Math.round(durations[Math.floor(durations.length * 0.95)]),
      p99Duration: Math.round(durations[Math.floor(durations.length * 0.99)]),
      cacheHitRate: Math.round((cacheHits / allMetrics.length) * 100),
      slowEndpoints,
    };
  }

  /**
   * Reset all metrics (typically for new session)
   */
  reset(): void {
    this.metrics.clear();
    this.metricsBuffer = [];
  }

  /**
   * Set slow query threshold
   */
  setSlowQueryThreshold(ms: number): void {
    this.slowQueryThreshold = ms;
  }

  /**
   * Set slow endpoint threshold
   */
  setSlowEndpointThreshold(ms: number): void {
    this.slowEndpointThreshold = ms;
  }
}

export const performanceMonitor = new PerformanceMonitor();
