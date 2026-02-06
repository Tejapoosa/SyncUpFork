/**
 * N+1 Query Detector - Identifies N+1 query patterns
 *
 * Detects and reports on N+1 query issues and suggests optimizations
 */

export interface N1Issue {
  endpoint: string;
  pattern: string;
  severity: 'high' | 'medium' | 'low';
  description: string;
  currentQueryCount: number;
  optimizedQueryCount: number;
  estimatedSavings: number;
  percentageSavings: number;
  suggestion: string;
}

export interface N1DetectionResult {
  endpoint: string;
  issuesFound: N1Issue[];
  totalSavingsPotential: number;
  recommendation: string;
}

export class N1Detector {
  private issues: N1Issue[] = [];
  private readonly HIGH_VARIANCE_THRESHOLD = 1.5;
  private readonly QUERY_RATIO_THRESHOLD = 2;

  /**
   * Detect N+1 patterns in endpoint queries
   */
  detectN1Patterns(
    endpoint: string,
    queries: any[],
    requestCount: number
  ): N1DetectionResult {
    const detected: N1Issue[] = [];
    const avgQueriesPerRequest = requestCount > 0 ? queries.length / requestCount : 0;

    // Pattern 1: Query count increases linearly with result count
    if (avgQueriesPerRequest > this.QUERY_RATIO_THRESHOLD) {
      const savings = Math.round(queries.length - (queries.length / avgQueriesPerRequest));
      detected.push({
        endpoint,
        pattern: 'Linear Query Growth',
        severity: avgQueriesPerRequest > 5 ? 'high' : 'medium',
        description: `Each request executes ~${avgQueriesPerRequest.toFixed(1)} queries on average`,
        currentQueryCount: queries.length,
        optimizedQueryCount: Math.max(1, Math.ceil(queries.length / avgQueriesPerRequest)),
        estimatedSavings: savings,
        percentageSavings: Math.round((savings / queries.length) * 100),
        suggestion: 'Use JOIN queries or batch operations to consolidate into 1-2 queries per request'
      });
    }

    // Pattern 2: High variance in query count (suggests data-dependent queries)
    const queryCounts = this.estimateQueryDistribution(queries, requestCount);
    const variance = this.calculateVariance(queryCounts);
    const mean = queryCounts.reduce((a, b) => a + b, 0) / queryCounts.length;

    if (variance > mean * this.HIGH_VARIANCE_THRESHOLD) {
      detected.push({
        endpoint,
        pattern: 'High Query Variance',
        severity: 'high',
        description: `Query count varies significantly (Variance: ${variance.toFixed(0)}, Mean: ${mean.toFixed(1)})`,
        currentQueryCount: queries.length,
        optimizedQueryCount: Math.ceil(queries.length * 0.5),
        estimatedSavings: Math.round(queries.length * 0.5),
        percentageSavings: 50,
        suggestion: 'Implement query batching or use pagination to control query volume'
      });
    }

    // Pattern 3: Repeated similar queries
    const groupedQueries = this.groupSimilarQueries(queries);
    const repeatedPatterns = Array.from(groupedQueries.entries())
      .filter(([, count]) => count > Math.max(2, requestCount * 0.1));

    if (repeatedPatterns.length > 0) {
      const repeatedCount = repeatedPatterns.reduce((sum, [, count]) => sum + count, 0);
      detected.push({
        endpoint,
        pattern: 'Repeated Query Patterns',
        severity: 'high',
        description: `${repeatedPatterns.length} query patterns executed multiple times`,
        currentQueryCount: queries.length,
        optimizedQueryCount: queries.length - repeatedCount + repeatedPatterns.length,
        estimatedSavings: repeatedCount - repeatedPatterns.length,
        percentageSavings: Math.round(((repeatedCount - repeatedPatterns.length) / queries.length) * 100),
        suggestion: 'Consolidate repeated queries using CTEs or subqueries'
      });
    }

    this.issues.push(...detected);

    return {
      endpoint,
      issuesFound: detected,
      totalSavingsPotential: detected.reduce((sum, issue) => sum + issue.estimatedSavings, 0),
      recommendation: this.generateEndpointRecommendation(detected)
    };
  }

  /**
   * Estimate query distribution
   */
  private estimateQueryDistribution(queries: any[], requestCount: number): number[] {
    if (requestCount === 0) return [0];
    const avgQueries = queries.length / requestCount;
    return Array(Math.min(requestCount, 100)).fill(avgQueries);
  }

  /**
   * Calculate variance
   */
  private calculateVariance(values: number[]): number {
    if (values.length < 2) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  }

  /**
   * Group similar queries by pattern
   */
  private groupSimilarQueries(queries: any[]): Map<string, number> {
    const patterns = new Map<string, number>();

    queries.forEach(query => {
      const pattern = this.normalizeQuery(query);
      patterns.set(pattern, (patterns.get(pattern) || 0) + 1);
    });

    return patterns;
  }

  /**
   * Normalize query for pattern matching
   */
  private normalizeQuery(query: any): string {
    if (typeof query === 'string') {
      return query.replace(/\d+/g, '?').replace(/['"][^'"]*['"]/g, '?');
    }
    return JSON.stringify(query).replace(/\d+/g, '?').replace(/['"][^'"]*['"]/g, '?');
  }

  /**
   * Generate recommendation for endpoint
   */
  private generateEndpointRecommendation(issues: N1Issue[]): string {
    const highSeverity = issues.filter(i => i.severity === 'high');

    if (highSeverity.length > 0) {
      const savings = highSeverity.reduce((sum, i) => sum + i.estimatedSavings, 0);
      return `🔴 PRIORITY: Fix ${highSeverity.length} critical issues to save ~${savings} queries`;
    }

    const totalSavings = issues.reduce((sum, i) => sum + i.estimatedSavings, 0);
    return totalSavings > 0
      ? `💡 Optimize to save ~${totalSavings} queries`
      : '✅ No N+1 issues detected';
  }

  /**
   * Get all detected issues
   */
  getAllIssues(): N1Issue[] {
    return this.issues;
  }

  /**
   * Get issues by endpoint
   */
  getIssuesByEndpoint(endpoint: string): N1Issue[] {
    return this.issues.filter(i => i.endpoint === endpoint);
  }

  /**
   * Get severity breakdown
   */
  getSeverityBreakdown(): { high: number; medium: number; low: number } {
    return {
      high: this.issues.filter(i => i.severity === 'high').length,
      medium: this.issues.filter(i => i.severity === 'medium').length,
      low: this.issues.filter(i => i.severity === 'low').length
    };
  }

  /**
   * Estimate total query savings potential
   */
  estimateTotalSavings(): number {
    return this.issues.reduce((sum, issue) => sum + issue.estimatedSavings, 0);
  }

  /**
   * Get top problem endpoints
   */
  getTopIssueEndpoints(limit: number = 10): Array<{ endpoint: string; issueCount: number; savingsPotential: number }> {
    const endpointData = new Map<string, { issueCount: number; savingsPotential: number }>();

    this.issues.forEach(issue => {
      const existing = endpointData.get(issue.endpoint) || { issueCount: 0, savingsPotential: 0 };
      endpointData.set(issue.endpoint, {
        issueCount: existing.issueCount + 1,
        savingsPotential: existing.savingsPotential + issue.estimatedSavings
      });
    });

    return Array.from(endpointData.entries())
      .map(([endpoint, data]) => ({ endpoint, ...data }))
      .sort((a, b) => b.savingsPotential - a.savingsPotential)
      .slice(0, limit);
  }

  /**
   * Export detailed report
   */
  exportReport(): object {
    const severity = this.getSeverityBreakdown();
    const topEndpoints = this.getTopIssueEndpoints(10);

    return {
      timestamp: new Date().toISOString(),
      summary: {
        totalIssues: this.issues.length,
        severity,
        estimatedSavings: this.estimateTotalSavings(),
        percentageSavingsPotential: this.issues.length > 0
          ? Math.round((this.estimateTotalSavings() /
              this.issues.reduce((sum, i) => sum + i.currentQueryCount, 0)) * 100)
          : 0
      },
      topEndpoints,
      allIssues: this.issues.map(issue => ({
        ...issue,
        priority: issue.severity === 'high' ? 'P0' : issue.severity === 'medium' ? 'P1' : 'P2'
      }))
    };
  }

  /**
   * Clear all issues
   */
  clear(): void {
    this.issues = [];
  }
}

export const n1Detector = new N1Detector();
