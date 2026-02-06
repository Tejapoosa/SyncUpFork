/**
 * Query Profiler - Detailed endpoint query analysis
 *
 * Tracks query patterns and identifies optimization opportunities
 */

import { performanceMonitor } from './performance-monitor';

export interface QueryProfile {
  endpoint: string;
  totalRequests: number;
  totalQueryCount: number;
  averageQueryCount: number;
  minQueries: number;
  maxQueries: number;
  slowQueryPercentage: number;
  estimatedN1Issues: number;
  recommendations: string[];
}

export interface EndpointProfile {
  endpoint: string;
  averageResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  cacheHitRate: number;
  throughput: number;
  errorRate: number;
  status: 'healthy' | 'slow' | 'critical';
  totalRequests: number;
}

export interface QueryMetric {
  endpoint: string;
  queryCount: number;
  duration: number;
  timestamp: number;
}

export class QueryProfiler {
  private profiles: Map<string, QueryProfile> = new Map();
  private endpointProfiles: Map<string, EndpointProfile> = new Map();
  private metrics: QueryMetric[] = [];

  /**
   * Record a query metric for analysis
   */
  recordMetric(endpoint: string, queryCount: number, duration: number): void {
    this.metrics.push({
      endpoint,
      queryCount,
      duration,
      timestamp: Date.now()
    });
  }

  /**
   * Profile an endpoint based on collected metrics
   */
  profileEndpoint(endpoint: string, metrics?: QueryMetric[]): QueryProfile {
    const relevantMetrics = metrics || this.metrics.filter(m => m.endpoint === endpoint);

    if (relevantMetrics.length === 0) {
      return {
        endpoint,
        totalRequests: 0,
        totalQueryCount: 0,
        averageQueryCount: 0,
        minQueries: 0,
        maxQueries: 0,
        slowQueryPercentage: 0,
        estimatedN1Issues: 0,
        recommendations: ['No data collected yet']
      };
    }

    const queries = relevantMetrics.reduce((sum, m) => sum + m.queryCount, 0);
    const avgQueries = queries / relevantMetrics.length;
    const queryCounts = relevantMetrics.map(m => m.queryCount);
    const durations = relevantMetrics.map(m => m.duration);

    // Detect potential N+1 issues
    const n1Estimate = this.estimateN1Issues(queryCounts, durations);

    const profile: QueryProfile = {
      endpoint,
      totalRequests: relevantMetrics.length,
      totalQueryCount: queries,
      averageQueryCount: avgQueries,
      minQueries: Math.min(...queryCounts),
      maxQueries: Math.max(...queryCounts),
      slowQueryPercentage: this.calculateSlowPercentage(durations),
      estimatedN1Issues: n1Estimate,
      recommendations: this.generateRecommendations(avgQueries, n1Estimate, durations)
    };

    this.profiles.set(endpoint, profile);
    return profile;
  }

  /**
   * Estimate potential N+1 query issues
   */
  private estimateN1Issues(queryCounts: number[], durations: number[]): number {
    // High variance in query count suggests N+1
    const variance = this.calculateVariance(queryCounts);
    const mean = queryCounts.reduce((a, b) => a + b, 0) / queryCounts.length;

    // Also check if duration increases with query count
    const correlation = this.calculateCorrelation(queryCounts, durations);

    // If high variance and high correlation, likely N+1
    if (variance > mean * mean && correlation > 0.7) {
      return Math.round(variance / 10) || 1;
    }

    return 0;
  }

  /**
   * Calculate percentage of slow queries
   */
  private calculateSlowPercentage(durations: number[]): number {
    const slowCount = durations.filter(d => d > 200).length;
    return (slowCount / Math.max(durations.length, 1)) * 100;
  }

  /**
   * Calculate variance of values
   */
  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  }

  /**
   * Calculate Pearson correlation coefficient
   */
  private calculateCorrelation(x: number[], y: number[]): number {
    if (x.length < 2 || x.length !== y.length) return 0;

    const n = x.length;
    const meanX = x.reduce((a, b) => a + b) / n;
    const meanY = y.reduce((a, b) => a + b) / n;

    let numerator = 0;
    let sumXSquares = 0;
    let sumYSquares = 0;

    for (let i = 0; i < n; i++) {
      const xDiff = x[i] - meanX;
      const yDiff = y[i] - meanY;
      numerator += xDiff * yDiff;
      sumXSquares += xDiff * xDiff;
      sumYSquares += yDiff * yDiff;
    }

    const denominator = Math.sqrt(sumXSquares * sumYSquares);
    return denominator === 0 ? 0 : numerator / denominator;
  }

  /**
   * Generate optimization recommendations
   */
  private generateRecommendations(
    avgQueries: number,
    n1Issues: number,
    durations: number[]
  ): string[] {
    const recommendations: string[] = [];
    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;

    if (avgQueries > 10) {
      recommendations.push('🔴 HIGH: Reduce query count with batch operations');
    } else if (avgQueries > 5) {
      recommendations.push('🟡 MEDIUM: Optimize query efficiency');
    }

    if (n1Issues > 0) {
      recommendations.push(`🔴 HIGH: Fix ${n1Issues} potential N+1 query issues`);
    }

    if (avgDuration > 1000) {
      recommendations.push('🔴 HIGH: Response time critical - optimize query execution');
    } else if (avgDuration > 500) {
      recommendations.push('🟡 MEDIUM: Response time slow - consider optimization');
    }

    recommendations.push('💡 Consider caching frequently accessed data');

    return recommendations;
  }

  /**
   * Get profile for specific endpoint
   */
  getEndpointProfile(endpoint: string): QueryProfile | undefined {
    return this.profiles.get(endpoint);
  }

  /**
   * Get all profiles
   */
  getAllProfiles(): QueryProfile[] {
    return Array.from(this.profiles.values());
  }

  /**
   * Get top slow endpoints
   */
  getSlowEndpoints(limit: number = 10): QueryProfile[] {
    return this.getAllProfiles()
      .sort((a, b) => b.averageQueryCount - a.averageQueryCount)
      .slice(0, limit);
  }

  /**
   * Export all profiles as report
   */
  exportProfiles(): object {
    const profiles = this.getAllProfiles();
    const summary = {
      totalEndpoints: profiles.length,
      averageQueriesPerEndpoint:
        profiles.reduce((sum, p) => sum + p.averageQueryCount, 0) / Math.max(profiles.length, 1),
      endpointsWithN1Issues: profiles.filter(p => p.estimatedN1Issues > 0).length,
      totalN1Issues: profiles.reduce((sum, p) => sum + p.estimatedN1Issues, 0),
    };

    return {
      generatedAt: new Date().toISOString(),
      summary,
      profiles: profiles.map(p => ({
        ...p,
        status: this.getEndpointStatus(p)
      })),
      topSlowEndpoints: this.getSlowEndpoints(5)
    };
  }

  /**
   * Determine endpoint health status
   */
  private getEndpointStatus(profile: QueryProfile): 'healthy' | 'slow' | 'critical' {
    if (profile.averageQueryCount > 10 || profile.estimatedN1Issues > 2) {
      return 'critical';
    }
    if (profile.averageQueryCount > 5 || profile.estimatedN1Issues > 0) {
      return 'slow';
    }
    return 'healthy';
  }

  /**
   * Clear all collected metrics
   */
  clearMetrics(): void {
    this.metrics = [];
  }

  /**
   * Get metric count
   */
  getMetricCount(): number {
    return this.metrics.length;
  }
}

export const queryProfiler = new QueryProfiler();
