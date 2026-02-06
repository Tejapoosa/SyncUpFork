# Phase 3.3 Days 3-4: Query Analysis & Profiling 🔍

**Date:** February 3-4, 2026
**Phase:** 3.3 Performance Optimization
**Days:** 3-4
**Focus:** Query Analysis, N+1 Detection, Performance Profiling
**Expected Outcome:** Complete baseline analysis + optimization roadmap

---

## 📊 TODAY'S OBJECTIVES

```
QUERY ANALYSIS
├─ Profile all high-frequency endpoints
├─ Identify N+1 query patterns
├─ Measure actual baseline performance
├─ Detect slow query bottlenecks
└─ Create optimization priorities

DOCUMENTATION
├─ Query profiling results
├─ Performance baseline metrics
├─ N+1 issue catalog
└─ Optimization recommendations

DELIVERABLES
├─ Query analyzer tool (enhanced)
├─ Performance profiling utilities
├─ Baseline metrics report
├─ N+1 detection scripts
└─ Optimization roadmap
```

---

## 🎯 EXECUTION PLAN

### Phase 1: Enhanced Query Analyzer (Day 3 - Morning)
Create tools to detect and analyze query patterns.

### Phase 2: Endpoint Profiling (Day 3 - Afternoon)
Profile all API endpoints to find slow ones.

### Phase 3: Baseline Measurement (Day 4 - Morning)
Measure current performance metrics.

### Phase 4: Report & Roadmap (Day 4 - Afternoon)
Create optimization recommendations.

---

## 📁 FILES TO CREATE

### Analysis Tools
- `lib/query-profiler.ts` - Profile endpoints in detail
- `lib/performance-baseline.ts` - Capture baseline metrics
- `lib/n1-detector.ts` - Detect N+1 query patterns
- `scripts/analyze-endpoints.ts` - Run analysis on all endpoints
- `scripts/profile-requests.ts` - Profile actual requests

### Documentation
- `PHASE3_3_DAY3_4_DETAILED_ANALYSIS.md` - Detailed results
- `QUERY_PROFILING_RESULTS.md` - Profiling findings
- `N1_ISSUES_CATALOG.md` - N+1 problems found
- `OPTIMIZATION_ROADMAP.md` - Action plan

---

## 🔧 IMPLEMENTATION

### Step 1: Enhanced Query Analyzer

Create `lib/query-profiler.ts`:

```typescript
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
}

export class QueryProfiler {
  private profiles: Map<string, QueryProfile> = new Map();
  private endpointProfiles: Map<string, EndpointProfile> = new Map();

  profileEndpoint(endpoint: string, requests: any[]): QueryProfile {
    const queries = requests.reduce((sum, req) => sum + (req.queryCount || 0), 0);
    const avgQueries = queries / Math.max(requests.length, 1);

    // Detect potential N+1 issues
    const n1Estimate = this.estimateN1Issues(requests);

    const profile: QueryProfile = {
      endpoint,
      totalRequests: requests.length,
      totalQueryCount: queries,
      averageQueryCount: avgQueries,
      minQueries: Math.min(...requests.map(r => r.queryCount || 0)),
      maxQueries: Math.max(...requests.map(r => r.queryCount || 0)),
      slowQueryPercentage: this.calculateSlowPercentage(requests),
      estimatedN1Issues: n1Estimate,
      recommendations: this.generateRecommendations(avgQueries, n1Estimate)
    };

    this.profiles.set(endpoint, profile);
    return profile;
  }

  private estimateN1Issues(requests: any[]): number {
    // If query count varies significantly, likely N+1
    const queryCounts = requests.map(r => r.queryCount || 0);
    const variance = this.calculateVariance(queryCounts);
    const mean = queryCounts.reduce((a, b) => a + b, 0) / queryCounts.length;

    // High variance relative to mean suggests N+1
    return variance > mean * mean ? Math.round(variance / 10) : 0;
  }

  private calculateSlowPercentage(requests: any[]): number {
    const slowCount = requests.filter(r => r.duration > 200).length;
    return (slowCount / Math.max(requests.length, 1)) * 100;
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  }

  private generateRecommendations(avgQueries: number, n1Issues: number): string[] {
    const recommendations: string[] = [];

    if (avgQueries > 10) {
      recommendations.push('🔴 HIGH: Reduce query count with batch operations');
    } else if (avgQueries > 5) {
      recommendations.push('🟡 MEDIUM: Optimize query efficiency');
    }

    if (n1Issues > 0) {
      recommendations.push(`🔴 HIGH: Fix ${n1Issues} potential N+1 query issues`);
    }

    recommendations.push('💡 Consider caching for this endpoint');
    return recommendations;
  }

  profileAllEndpoints(): QueryProfile[] {
    return Array.from(this.profiles.values());
  }

  getEndpointProfile(endpoint: string): QueryProfile | undefined {
    return this.profiles.get(endpoint);
  }

  exportProfiles(): object {
    return {
      generatedAt: new Date().toISOString(),
      totalEndpoints: this.profiles.size,
      profiles: Array.from(this.profiles.entries()).map(([endpoint, profile]) => ({
        endpoint,
        ...profile
      }))
    };
  }
}

export const queryProfiler = new QueryProfiler();
```

### Step 2: Performance Baseline Tracker

Create `lib/performance-baseline.ts`:

```typescript
export interface BaselineMetrics {
  timestamp: string;
  endpoint: string;
  responseTime: number;
  queryCount: number;
  duration: number;
  cached: boolean;
  status: number;
}

export interface AggregatedBaseline {
  endpoint: string;
  avgResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  avgQueryCount: number;
  cacheHitRate: number;
  errorRate: number;
  totalRequests: number;
}

export class PerformanceBaseline {
  private metrics: BaselineMetrics[] = [];
  private aggregated: Map<string, AggregatedBaseline> = new Map();

  recordMetric(metric: BaselineMetrics): void {
    this.metrics.push(metric);
  }

  aggregateMetrics(): void {
    const byEndpoint = new Map<string, BaselineMetrics[]>();

    this.metrics.forEach(metric => {
      if (!byEndpoint.has(metric.endpoint)) {
        byEndpoint.set(metric.endpoint, []);
      }
      byEndpoint.get(metric.endpoint)!.push(metric);
    });

    byEndpoint.forEach((metrics, endpoint) => {
      const responseTimes = metrics.map(m => m.responseTime).sort((a, b) => a - b);
      const queryCounts = metrics.map(m => m.queryCount);
      const cachedCount = metrics.filter(m => m.cached).length;
      const errorCount = metrics.filter(m => m.status >= 400).length;

      const aggregated: AggregatedBaseline = {
        endpoint,
        avgResponseTime: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
        p95ResponseTime: responseTimes[Math.floor(responseTimes.length * 0.95)],
        p99ResponseTime: responseTimes[Math.floor(responseTimes.length * 0.99)],
        avgQueryCount: queryCounts.reduce((a, b) => a + b, 0) / queryCounts.length,
        cacheHitRate: (cachedCount / metrics.length) * 100,
        errorRate: (errorCount / metrics.length) * 100,
        totalRequests: metrics.length
      };

      this.aggregated.set(endpoint, aggregated);
    });
  }

  getBaseline(endpoint: string): AggregatedBaseline | undefined {
    return this.aggregated.get(endpoint);
  }

  getAllBaselines(): AggregatedBaseline[] {
    return Array.from(this.aggregated.values());
  }

  getHealthStatus(endpoint: string): 'healthy' | 'slow' | 'critical' {
    const baseline = this.aggregated.get(endpoint);
    if (!baseline) return 'healthy';

    if (baseline.avgResponseTime > 1000) return 'critical';
    if (baseline.avgResponseTime > 500) return 'slow';
    return 'healthy';
  }

  exportBaseline(): object {
    return {
      timestamp: new Date().toISOString(),
      totalMetrics: this.metrics.length,
      totalEndpoints: this.aggregated.size,
      baselines: Array.from(this.aggregated.values()),
      summary: {
        avgGlobalResponseTime: this.calculateGlobalAvg(),
        slowEndpoints: this.getSlowEndpoints(),
        criticalEndpoints: this.getCriticalEndpoints()
      }
    };
  }

  private calculateGlobalAvg(): number {
    const sum = Array.from(this.aggregated.values())
      .reduce((total, baseline) => total + baseline.avgResponseTime, 0);
    return sum / Math.max(this.aggregated.size, 1);
  }

  private getSlowEndpoints(): string[] {
    return Array.from(this.aggregated.entries())
      .filter(([, baseline]) => baseline.avgResponseTime > 500 && baseline.avgResponseTime <= 1000)
      .map(([endpoint]) => endpoint);
  }

  private getCriticalEndpoints(): string[] {
    return Array.from(this.aggregated.entries())
      .filter(([, baseline]) => baseline.avgResponseTime > 1000)
      .map(([endpoint]) => endpoint);
  }
}

export const performanceBaseline = new PerformanceBaseline();
```

### Step 3: N+1 Query Detector

Create `lib/n1-detector.ts`:

```typescript
export interface N1Issue {
  endpoint: string;
  pattern: string;
  severity: 'high' | 'medium' | 'low';
  description: string;
  currentQueryCount: number;
  optimizedQueryCount: number;
  estimatedSavings: number;
  suggestion: string;
}

export class N1Detector {
  private issues: N1Issue[] = [];

  detectN1Patterns(endpoint: string, queries: any[], requestCount: number): N1Issue[] {
    const detected: N1Issue[] = [];

    // Pattern 1: Query count increases linearly with result count
    const avgQueriesPerRequest = queries.length / requestCount;

    if (avgQueriesPerRequest > 2) {
      detected.push({
        endpoint,
        pattern: 'Linear Query Growth',
        severity: avgQueriesPerRequest > 5 ? 'high' : 'medium',
        description: `Each request executes ${avgQueriesPerRequest.toFixed(1)} queries on average`,
        currentQueryCount: queries.length,
        optimizedQueryCount: Math.ceil(queries.length / avgQueriesPerRequest),
        estimatedSavings: Math.round(queries.length - (queries.length / avgQueriesPerRequest)),
        suggestion: 'Use JOIN or batch queries to consolidate into 1-2 queries'
      });
    }

    // Pattern 2: Repeated similar queries
    const queryPatterns = this.groupSimilarQueries(queries);
    const repeatedQueries = Array.from(queryPatterns.entries())
      .filter(([, count]) => count > requestCount * 0.5);

    if (repeatedQueries.length > 0) {
      detected.push({
        endpoint,
        pattern: 'Repeated Queries',
        severity: 'high',
        description: `Same query executed multiple times per request`,
        currentQueryCount: queries.length,
        optimizedQueryCount: queries.length - repeatedQueries.length,
        estimatedSavings: repeatedQueries.length,
        suggestion: 'Batch similar queries or use subqueries'
      });
    }

    this.issues.push(...detected);
    return detected;
  }

  private groupSimilarQueries(queries: any[]): Map<string, number> {
    const patterns = new Map<string, number>();

    queries.forEach(query => {
      const pattern = this.normalizeQuery(query);
      patterns.set(pattern, (patterns.get(pattern) || 0) + 1);
    });

    return patterns;
  }

  private normalizeQuery(query: any): string {
    // Normalize query for pattern matching
    if (typeof query === 'string') {
      return query.replace(/\d+/g, '?');
    }
    return JSON.stringify(query).replace(/\d+/g, '?');
  }

  getAllIssues(): N1Issue[] {
    return this.issues;
  }

  getIssuesByEndpoint(endpoint: string): N1Issue[] {
    return this.issues.filter(i => i.endpoint === endpoint);
  }

  getSeverityBreakdown() {
    return {
      high: this.issues.filter(i => i.severity === 'high').length,
      medium: this.issues.filter(i => i.severity === 'medium').length,
      low: this.issues.filter(i => i.severity === 'low').length
    };
  }

  estimateTotalSavings(): number {
    return this.issues.reduce((sum, issue) => sum + issue.estimatedSavings, 0);
  }

  exportReport(): object {
    return {
      timestamp: new Date().toISOString(),
      totalIssues: this.issues.length,
      severityBreakdown: this.getSeverityBreakdown(),
      estimatedSavings: this.estimateTotalSavings(),
      issues: this.issues,
      topEndpoints: this.getTopIssueEndpoints(5)
    };
  }

  private getTopIssueEndpoints(limit: number): Array<{endpoint: string; issueCount: number}> {
    const endpointCounts = new Map<string, number>();

    this.issues.forEach(issue => {
      endpointCounts.set(issue.endpoint, (endpointCounts.get(issue.endpoint) || 0) + 1);
    });

    return Array.from(endpointCounts.entries())
      .map(([endpoint, count]) => ({ endpoint, issueCount: count }))
      .sort((a, b) => b.issueCount - a.issueCount)
      .slice(0, limit);
  }
}

export const n1Detector = new N1Detector();
```

---

## 📝 ANALYSIS RESULTS TEMPLATE

Create `QUERY_PROFILING_RESULTS.md`:

```markdown
# Query Profiling Results

**Date:** February 3-4, 2026
**Duration:** 24 hours
**Total Endpoints Profiled:** [N]
**Total Requests Analyzed:** [N]

## Executive Summary

### Key Findings
- [Finding 1]
- [Finding 2]
- [Finding 3]

### Quick Wins
- [Quick Fix 1]
- [Quick Fix 2]

## Endpoint Analysis

### Highest Priority Endpoints

#### 1. [Endpoint Name]
- **Current Response Time:** [ms]
- **Average Query Count:** [N]
- **Status:** 🔴 Critical
- **Issue:** [Description]
- **Recommendation:** [Solution]
- **Estimated Improvement:** [%]

### Performance Summary
[Table of all endpoints with metrics]

## N+1 Query Issues

### Detected Issues: [N]
- Severity High: [N]
- Severity Medium: [N]
- Severity Low: [N]

### Estimated Query Reduction
- Current Total: [N] queries
- Optimized Total: [N] queries
- **Potential Savings:** [N%]

## Optimization Roadmap

### Phase 1: Quick Wins (Days 5-6)
- [Issue 1]
- [Issue 2]

### Phase 2: Major Optimizations (Days 7-14)
- [Issue 3]
- [Issue 4]

### Phase 3: Fine Tuning (Days 15-21)
- [Issue 5]
- [Issue 6]

## Implementation Timeline
- Days 5-6: Quick wins implementation
- Days 7-14: Major optimizations
- Days 15-21: Fine tuning and verification
```

---

## 🚀 TODAY'S DELIVERABLES

### Code Files (3)
```
✅ lib/query-profiler.ts
✅ lib/performance-baseline.ts
✅ lib/n1-detector.ts
```

### Analysis & Documentation
```
✅ Complete endpoint profiling
✅ Query pattern analysis
✅ N+1 issue catalog
✅ Performance baseline metrics
✅ Optimization roadmap
✅ Implementation plan
```

---

## ⚡ QUICK SUMMARY

**What We're Doing:**
- Analyzing all API endpoints to find performance issues
- Measuring current query counts and response times
- Detecting N+1 query patterns
- Creating a priority list of optimizations

**Expected Outcomes:**
- Complete baseline metrics
- Top 10 optimization targets
- Estimated 40-60% performance improvement potential
- Clear implementation roadmap

**Success Criteria:**
- ✅ All endpoints profiled
- ✅ Baseline metrics captured
- ✅ N+1 issues identified
- ✅ Roadmap created
- ✅ Documentation complete

---

## 📊 PROGRESS TRACKING

- [x] Planning (Phase 1)
- [x] Infrastructure (Phase 2)
- [ ] Query Analysis (Phase 3) ← **WE ARE HERE**
- [ ] Query Optimization (Phase 4)
- [ ] Caching Integration (Phase 5)
- [ ] Final Optimization (Phase 6)

---

**Status:** 🟡 In Progress
**Duration:** 2 days
**Expected Completion:** February 4, 2026
**Next Step:** Query Optimization Implementation
