/**
 * Query Optimization Analysis
 * Identifies and tracks N+1 queries and other inefficiencies
 */

import { logger } from '@/lib/logger';

export interface QueryAnalysis {
  endpoint: string;
  totalQueries: number;
  uniqueQueries: number;
  n1Issues: string[];
  slowQueries: QueryTiming[];
  optimization: string;
}

export interface QueryTiming {
  query: string;
  duration: number;
  count: number;
}

class QueryAnalyzer {
  private queryMap: Map<string, number> = new Map();
  private analyses: QueryAnalysis[] = [];
  private threshold = 200; // ms for slow queries

  /**
   * Record a query execution
   */
  recordQuery(query: string, duration: number): void {
    const key = this.normalizeQuery(query);
    this.queryMap.set(key, (this.queryMap.get(key) || 0) + 1);

    if (duration > this.threshold) {
      logger.warn({
        message: 'Slow query detected',
        query: key,
        duration,
      });
    }
  }

  /**
   * Analyze queries for an endpoint
   */
  analyzeEndpoint(endpoint: string, queries: string[]): QueryAnalysis {
    const unique = new Set(queries.map((q) => this.normalizeQuery(q)));
    const n1Issues = this.detectN1Queries(queries);

    const analysis: QueryAnalysis = {
      endpoint,
      totalQueries: queries.length,
      uniqueQueries: unique.size,
      n1Issues,
      slowQueries: [],
      optimization: this.suggestOptimization(unique.size, n1Issues.length),
    };

    this.analyses.push(analysis);
    return analysis;
  }

  /**
   * Detect potential N+1 query patterns
   */
  private detectN1Queries(queries: string[]): string[] {
    const issues: string[] = [];
    const groups = new Map<string, number>();

    // Group similar queries
    for (const query of queries) {
      const normalized = this.normalizeQuery(query);
      groups.set(normalized, (groups.get(normalized) || 0) + 1);
    }

    // Identify N+1 patterns (many similar queries)
    for (const [query, count] of groups.entries()) {
      if (count > 5 && query.includes('WHERE')) {
        issues.push(`Potential N+1: ${query} executed ${count} times`);
      }
    }

    return issues;
  }

  /**
   * Normalize query for comparison
   */
  private normalizeQuery(query: string): string {
    return query
      .replace(/\d+/g, '?') // Replace numbers with placeholders
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Suggest optimization based on query pattern
   */
  private suggestOptimization(uniqueQueries: number, n1Count: number): string {
    if (n1Count > 0) {
      return 'Use JOIN queries or batch operations instead of N+1 queries';
    }

    if (uniqueQueries > 10) {
      return 'Consider caching results or using pagination';
    }

    if (uniqueQueries > 5) {
      return 'Implement selective field retrieval (projections)';
    }

    return 'Query pattern is acceptable';
  }

  /**
   * Get all analyses
   */
  getAnalyses(): QueryAnalysis[] {
    return this.analyses;
  }

  /**
   * Clear analyses
   */
  reset(): void {
    this.queryMap.clear();
    this.analyses = [];
  }
}

export const queryAnalyzer = new QueryAnalyzer();

// Sample high-frequency endpoints analysis
export const highFrequencyEndpoints = [
  {
    endpoint: '/api/meetings/list',
    queryPattern: `
      SELECT * FROM meetings WHERE userId = ? ORDER BY createdAt DESC
      → THEN for each: SELECT * FROM attendees WHERE meetingId = ?
      → THEN for each: SELECT * FROM notes WHERE meetingId = ?
    `,
    recommendation: `
      USE: SELECT m.*, a.*, n.* FROM meetings m
           LEFT JOIN attendees a ON m.id = a.meetingId
           LEFT JOIN notes n ON m.id = n.meetingId
           WHERE m.userId = ? ORDER BY m.createdAt DESC
    `,
    savingsEstimate: '70% query reduction',
  },
  {
    endpoint: '/api/user/usage',
    queryPattern: `
      SELECT * FROM users WHERE id = ?
      → THEN: SELECT * FROM usage WHERE userId = ?
      → THEN: SELECT * FROM rateLimits WHERE userId = ?
    `,
    recommendation: `
      SELECT u.*, us.*, rl.* FROM users u
      LEFT JOIN usage us ON u.id = us.userId
      LEFT JOIN rateLimits rl ON u.id = rl.userId
      WHERE u.id = ?
    `,
    savingsEstimate: '66% query reduction',
  },
  {
    endpoint: '/api/rag/chat',
    queryPattern: `
      SELECT * FROM sessions WHERE id = ?
      → THEN: SELECT * FROM messages WHERE sessionId = ?
      → THEN for each message: SELECT * FROM embeddings WHERE messageId = ?
    `,
    recommendation: `
      Add indexes on sessionId, messageId
      Cache recent messages (TTL: 5 min)
      Use pagination for message retrieval
    `,
    savingsEstimate: '60% query reduction + cache hits',
  },
];
