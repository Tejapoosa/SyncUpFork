/**
 * Performance Baseline - Captures and aggregates baseline metrics
 *
 * Tracks performance metrics over time for comparison and optimization planning
 */

export interface BaselineMetric {
  timestamp: string;
  endpoint: string;
  responseTime: number;
  queryCount: number;
  duration: number;
  cached: boolean;
  cacheHit: boolean;
  status: number;
}

export interface AggregatedBaseline {
  endpoint: string;
  totalRequests: number;
  avgResponseTime: number;
  p50ResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  avgQueryCount: number;
  minQueries: number;
  maxQueries: number;
  cacheHitRate: number;
  errorRate: number;
  errorCount: number;
  healthStatus: 'healthy' | 'slow' | 'critical';
  suggestions: string[];
}

export interface BaselineReport {
  timestamp: string;
  totalMetrics: number;
  totalEndpoints: number;
  dataDuration: string;
  summary: {
    avgGlobalResponseTime: number;
    medianGlobalResponseTime: number;
    p95GlobalResponseTime: number;
    slowEndpoints: string[];
    criticalEndpoints: string[];
    avgCacheHitRate: number;
    avgErrorRate: number;
  };
  baselines: AggregatedBaseline[];
}

export class PerformanceBaseline {
  private metrics: BaselineMetric[] = [];
  private aggregated: Map<string, AggregatedBaseline> = new Map();

  /**
   * Record a performance metric
   */
  recordMetric(metric: BaselineMetric): void {
    this.metrics.push(metric);
  }

  /**
   * Record multiple metrics
   */
  recordMetrics(metrics: BaselineMetric[]): void {
    this.metrics.push(...metrics);
  }

  /**
   * Aggregate metrics by endpoint
   */
  aggregateMetrics(): void {
    const byEndpoint = new Map<string, BaselineMetric[]>();

    this.metrics.forEach(metric => {
      if (!byEndpoint.has(metric.endpoint)) {
        byEndpoint.set(metric.endpoint, []);
      }
      byEndpoint.get(metric.endpoint)!.push(metric);
    });

    byEndpoint.forEach((metrics, endpoint) => {
      const aggregated = this.aggregateEndpointMetrics(endpoint, metrics);
      this.aggregated.set(endpoint, aggregated);
    });
  }

  /**
   * Aggregate metrics for a single endpoint
   */
  private aggregateEndpointMetrics(endpoint: string, metrics: BaselineMetric[]): AggregatedBaseline {
    if (metrics.length === 0) {
      return {
        endpoint,
        totalRequests: 0,
        avgResponseTime: 0,
        p50ResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
        avgQueryCount: 0,
        minQueries: 0,
        maxQueries: 0,
        cacheHitRate: 0,
        errorRate: 0,
        errorCount: 0,
        healthStatus: 'healthy',
        suggestions: []
      };
    }

    const responseTimes = metrics.map(m => m.responseTime).sort((a, b) => a - b);
    const queryCounts = metrics.map(m => m.queryCount);
    const cachedCount = metrics.filter(m => m.cached || m.cacheHit).length;
    const errorCount = metrics.filter(m => m.status >= 400).length;

    const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const avgQueryCount = queryCounts.reduce((a, b) => a + b, 0) / queryCounts.length;

    const aggregated: AggregatedBaseline = {
      endpoint,
      totalRequests: metrics.length,
      avgResponseTime,
      p50ResponseTime: responseTimes[Math.floor(responseTimes.length * 0.5)],
      p95ResponseTime: responseTimes[Math.floor(responseTimes.length * 0.95)],
      p99ResponseTime: responseTimes[Math.floor(responseTimes.length * 0.99)],
      avgQueryCount,
      minQueries: Math.min(...queryCounts),
      maxQueries: Math.max(...queryCounts),
      cacheHitRate: (cachedCount / metrics.length) * 100,
      errorRate: (errorCount / metrics.length) * 100,
      errorCount,
      healthStatus: this.determineHealthStatus(avgResponseTime, errorCount, metrics.length),
      suggestions: this.generateSuggestions(avgResponseTime, avgQueryCount, errorCount)
    };

    return aggregated;
  }

  /**
   * Determine health status based on metrics
   */
  private determineHealthStatus(
    avgResponseTime: number,
    errorCount: number,
    totalRequests: number
  ): 'healthy' | 'slow' | 'critical' {
    const errorRate = (errorCount / totalRequests) * 100;

    if (avgResponseTime > 1000 || errorRate > 5) {
      return 'critical';
    }
    if (avgResponseTime > 500 || errorRate > 2) {
      return 'slow';
    }
    return 'healthy';
  }

  /**
   * Generate optimization suggestions
   */
  private generateSuggestions(
    avgResponseTime: number,
    avgQueryCount: number,
    errorCount: number
  ): string[] {
    const suggestions: string[] = [];

    if (avgResponseTime > 1000) {
      suggestions.push('🔴 Critical: Response time > 1000ms - urgent optimization needed');
    } else if (avgResponseTime > 500) {
      suggestions.push('🟡 Response time > 500ms - consider optimization');
    }

    if (avgQueryCount > 10) {
      suggestions.push('🔴 High query count - consider batch operations or caching');
    } else if (avgQueryCount > 5) {
      suggestions.push('🟡 Query count elevated - optimization opportunity');
    }

    if (errorCount > 0) {
      suggestions.push('⚠️ Errors detected - investigate and fix');
    }

    if (suggestions.length === 0) {
      suggestions.push('✅ Performance is healthy');
    }

    return suggestions;
  }

  /**
   * Get baseline for specific endpoint
   */
  getBaseline(endpoint: string): AggregatedBaseline | undefined {
    return this.aggregated.get(endpoint);
  }

  /**
   * Get all baselines
   */
  getAllBaselines(): AggregatedBaseline[] {
    return Array.from(this.aggregated.values());
  }

  /**
   * Get all baselines sorted by response time
   */
  getBaselinesSortedByResponseTime(): AggregatedBaseline[] {
    return this.getAllBaselines().sort((a, b) => b.avgResponseTime - a.avgResponseTime);
  }

  /**
   * Get health status of endpoint
   */
  getHealthStatus(endpoint: string): 'healthy' | 'slow' | 'critical' | undefined {
    return this.aggregated.get(endpoint)?.healthStatus;
  }

  /**
   * Get slow endpoints
   */
  getSlowEndpoints(): string[] {
    return Array.from(this.aggregated.entries())
      .filter(([, baseline]) => baseline.healthStatus === 'slow')
      .map(([endpoint]) => endpoint);
  }

  /**
   * Get critical endpoints
   */
  getCriticalEndpoints(): string[] {
    return Array.from(this.aggregated.entries())
      .filter(([, baseline]) => baseline.healthStatus === 'critical')
      .map(([endpoint]) => endpoint);
  }

  /**
   * Calculate global average response time
   */
  getGlobalAverageResponseTime(): number {
    const baselines = this.getAllBaselines();
    if (baselines.length === 0) return 0;

    const sum = baselines.reduce((total, baseline) => total + baseline.avgResponseTime, 0);
    return sum / baselines.length;
  }

  /**
   * Calculate global median response time
   */
  getGlobalMedianResponseTime(): number {
    const responseTimes = this.metrics
      .map(m => m.responseTime)
      .sort((a, b) => a - b);

    if (responseTimes.length === 0) return 0;
    const mid = Math.floor(responseTimes.length / 2);
    return responseTimes.length % 2 !== 0
      ? responseTimes[mid]
      : (responseTimes[mid - 1] + responseTimes[mid]) / 2;
  }

  /**
   * Get average cache hit rate
   */
  getAverageCacheHitRate(): number {
    const baselines = this.getAllBaselines();
    if (baselines.length === 0) return 0;

    const sum = baselines.reduce((total, baseline) => total + baseline.cacheHitRate, 0);
    return sum / baselines.length;
  }

  /**
   * Get average error rate
   */
  getAverageErrorRate(): number {
    const baselines = this.getAllBaselines();
    if (baselines.length === 0) return 0;

    const sum = baselines.reduce((total, baseline) => total + baseline.errorRate, 0);
    return sum / baselines.length;
  }

  /**
   * Get metric count
   */
  getMetricCount(): number {
    return this.metrics.length;
  }

  /**
   * Get endpoint count
   */
  getEndpointCount(): number {
    return this.aggregated.size;
  }

  /**
   * Export comprehensive report
   */
  exportReport(): BaselineReport {
    this.aggregateMetrics();
    const baselines = this.getAllBaselines();

    return {
      timestamp: new Date().toISOString(),
      totalMetrics: this.metrics.length,
      totalEndpoints: baselines.length,
      dataDuration: this.calculateDataDuration(),
      summary: {
        avgGlobalResponseTime: this.getGlobalAverageResponseTime(),
        medianGlobalResponseTime: this.getGlobalMedianResponseTime(),
        p95GlobalResponseTime: this.calculateGlobalP95ResponseTime(),
        slowEndpoints: this.getSlowEndpoints(),
        criticalEndpoints: this.getCriticalEndpoints(),
        avgCacheHitRate: this.getAverageCacheHitRate(),
        avgErrorRate: this.getAverageErrorRate()
      },
      baselines: baselines.sort((a, b) => b.avgResponseTime - a.avgResponseTime)
    };
  }

  /**
   * Calculate global P95 response time
   */
  private calculateGlobalP95ResponseTime(): number {
    const responseTimes = this.metrics
      .map(m => m.responseTime)
      .sort((a, b) => a - b);

    if (responseTimes.length === 0) return 0;
    return responseTimes[Math.floor(responseTimes.length * 0.95)];
  }

  /**
   * Calculate data collection duration
   */
  private calculateDataDuration(): string {
    if (this.metrics.length === 0) return 'N/A';

    const timestamps = this.metrics.map(m => new Date(m.timestamp).getTime());
    const minTime = Math.min(...timestamps);
    const maxTime = Math.max(...timestamps);
    const durationMs = maxTime - minTime;

    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));

    return `${hours}h ${minutes}m`;
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
    this.aggregated.clear();
  }
}

export const performanceBaseline = new PerformanceBaseline();
