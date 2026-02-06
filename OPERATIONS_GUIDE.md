# Operations Guide

## System Overview

SyncUp is a production application serving meeting summaries and AI chat capabilities. This guide covers operational procedures, troubleshooting, and incident response.

## Environment Setup

### Production Environment
- **Server**: AWS EC2 / Vercel
- **Database**: RDS PostgreSQL
- **Cache**: ElastiCache Redis
- **CDN**: CloudFront
- **Monitoring**: CloudWatch + DataDog

### Environment Variables

**Database**
```
DATABASE_URL=postgresql://user:pass@host:5432/syncup
DATABASE_SSL=true
```

**Authentication**
```
NEXTAUTH_SECRET=<generated-secret>
NEXTAUTH_URL=https://syncup.example.com
JWT_SECRET=<generated-secret>
```

**Third-Party Services**
```
OPENAI_API_KEY=sk-...
SLACK_BOT_TOKEN=xoxb-...
SLACK_SIGNING_SECRET=<secret>
GOOGLE_CLIENT_ID=<id>
GOOGLE_CLIENT_SECRET=<secret>
```

**Monitoring**
```
LOG_LEVEL=info
SENTRY_DSN=https://...
DATADOG_API_KEY=<key>
```

## Deployment Procedures

### Pre-Deployment Checklist
- [ ] Code reviewed and approved
- [ ] All tests passing
- [ ] Database migrations reviewed
- [ ] Environment variables set
- [ ] Backup created
- [ ] Communication sent to team

### Staging Deployment
```bash
# 1. Deploy to staging
npm run deploy:staging

# 2. Run smoke tests
npm run test:smoke:staging

# 3. Check monitoring
# Visit: https://monitoring.example.com

# 4. Verify functionality
# - Test user registration
# - Test Slack integration
# - Test chat functionality
```

### Production Deployment
```bash
# 1. Create backup
npm run backup:prod

# 2. Deploy to production
npm run deploy:production

# 3. Run verification tests
npm run test:smoke:prod

# 4. Monitor metrics
# Watch error rates for 30 minutes
# Check database performance
# Monitor API response times

# 5. Notify team
# Send deployment notification
```

### Rollback Procedure
```bash
# 1. Identify issue
# Check monitoring dashboard
# Review error logs

# 2. Decide rollback
# Get approval from tech lead

# 3. Execute rollback
npm run rollback:production

# 4. Verify
npm run test:smoke:prod

# 5. Post-mortem
# Schedule incident review
# Document findings
```

## Monitoring & Alerting

### Key Metrics

**Application Health**
- CPU usage: < 70%
- Memory: < 80%
- Error rate: < 1%
- Response time (p99): < 2000ms

**Database Health**
- Connection pool: < 80%
- Query time (p99): < 500ms
- Slow queries: < 5/min
- Replication lag: < 1s

**API Performance**
- Request latency (p50): < 200ms
- Request latency (p99): < 2000ms
- Throughput: > 100 req/s
- Error rate: < 1%

### Alert Thresholds

```yaml
Alerts:
  - name: HighErrorRate
    threshold: error_rate > 5%
    severity: Critical

  - name: SlowQueries
    threshold: p99_query_time > 1000ms
    severity: High

  - name: DatabaseConnection
    threshold: connection_pool > 90%
    severity: Critical

  - name: HighLatency
    threshold: p99_latency > 3000ms
    severity: High

  - name: LowDiskSpace
    threshold: disk_free < 10%
    severity: Critical
```

### Monitoring Dashboard
- **Primary**: CloudWatch (AWS)
- **Detailed**: DataDog
- **Uptime**: StatusPage.io
- **Logs**: CloudWatch Logs + ELK Stack

## Troubleshooting

### Common Issues

**High Error Rate**
```bash
# 1. Check error logs
npm run logs:error --limit 100

# 2. Identify error pattern
npm run analyze:errors

# 3. Check recent deployments
npm run deployments:list --limit 5

# 4. Rollback if needed
npm run rollback:production
```

**Slow Database Queries**
```bash
# 1. Check slow query log
npm run queries:slow --limit 10

# 2. Profile queries
npm run profile:queries

# 3. Check for N+1 problems
npm run detect:n1-queries

# 4. Optimize or add indexes
npx prisma studio  # Analyze schema
```

**High Memory Usage**
```bash
# 1. Check heap usage
npm run analyze:memory

# 2. Identify memory leaks
npm run debug:memory-leaks

# 3. Review recent code changes
git log --oneline -10

# 4. Restart service if needed
npm run restart:production
```

**API Timeouts**
```bash
# 1. Check external service status
curl -i https://api.openai.com/health

# 2. Review API logs
npm run logs:api --limit 50

# 3. Check rate limits
npm run check:rate-limits

# 4. Increase timeouts if appropriate
# Edit config and redeploy
```

## Backup & Recovery

### Backup Schedule
- **Frequency**: Hourly automated backups
- **Retention**: 30-day rolling window
- **Type**: Full backup daily, incremental hourly
- **Location**: AWS S3 (replicated across regions)

### Creating Manual Backup
```bash
npm run backup:prod

# Output: backup_2024_01_15_143022.sql.gz
# Size: Check with: du -h backup_*.sql.gz
```

### Recovery Procedure

**Full Database Recovery**
```bash
# 1. Stop application
npm run stop:production

# 2. List available backups
npm run list:backups

# 3. Restore from backup
npm run restore:prod --backup backup_2024_01_15_143022.sql.gz

# 4. Verify restore
npm run test:db:integrity

# 5. Restart application
npm run start:production

# 6. Monitor metrics
npm run monitor --duration 5m
```

**Point-in-Time Recovery**
```bash
# If backup method supports PITR
npm run restore:prod --timestamp "2024-01-15 14:30:00"
```

### Testing Recovery
```bash
# Monthly recovery test
npm run test:backup-recovery

# This validates:
# - Backup integrity
# - Recovery procedures
# - Recovery time
# - Data consistency
```

## Security Procedures

### Access Control
- SSH via VPN only
- Deploy via GitHub Actions (no manual SSH)
- Database access via bastion host
- Credentials in AWS Secrets Manager

### Secrets Management
```bash
# Rotate secrets quarterly
npm run rotate:secrets

# View secrets (masked)
npm run view:secrets

# Update secret
npm run update:secret --key DATABASE_URL --value postgresql://...
```

### Security Scanning
```bash
# Scan dependencies
npm audit

# Scan infrastructure
npm run scan:infrastructure

# Run security tests
npm run test:security
```

## Incident Response

### Severity Levels

**Critical (P1)**
- System down
- Data loss
- Security breach
- All users affected

**High (P2)**
- Major feature broken
- Significant performance degradation
- Some users affected

**Medium (P3)**
- Minor feature broken
- Workaround available
- Limited user impact

**Low (P4)**
- UI issues
- Non-critical errors
- No user impact

### On-Call Escalation
```
L1: On-call engineer
L2: Engineering lead (if not resolved in 30 min)
L3: Tech lead (if not resolved in 1 hour)
L4: Executive (if not resolved in 2 hours)
```

### Incident Response Steps
1. **Alert** - Receive alert
2. **Triage** - Determine severity
3. **Acknowledge** - Confirm receipt
4. **Investigate** - Root cause analysis
5. **Mitigate** - Reduce impact
6. **Resolve** - Fix issue
7. **Post-mortem** - Learn and improve

### Incident Documentation
```bash
# Create incident report
npm run incident:create --title "Issue description"

# Update incident status
npm run incident:update --id INC123 --status investigating

# Close incident
npm run incident:close --id INC123

# Generate post-mortem
npm run incident:postmortem --id INC123
```

## Maintenance Windows

### Planned Maintenance
- **Window**: Sundays 2-4 AM UTC (low traffic)
- **Duration**: Max 2 hours
- **Notifications**: Sent 48 hours prior
- **Team**: On-call engineer + backup

### Maintenance Tasks
```bash
# Database maintenance
npm run maintenance:db

# Index optimization
npm run maintenance:indexes

# Cache cleanup
npm run maintenance:cache

# Log rotation
npm run maintenance:logs
```

## Useful Commands

```bash
# Status
npm run status                  # Overall system status
npm run health:check           # Health check
npm run metrics:current         # Current metrics

# Logs
npm run logs:error             # Error logs
npm run logs:api               # API logs
npm run logs:search "query"    # Search logs

# Database
npm run db:check               # Check connection
npm run db:stats               # Database statistics
npm run queries:slow           # Slow queries

# Deployment
npm run deploy:staging         # Deploy to staging
npm run deploy:production      # Deploy to production
npm run rollback:production    # Rollback production

# Backup & Recovery
npm run backup:prod            # Create backup
npm run list:backups           # List backups
npm run restore:prod           # Restore from backup
```

## Contacts

- **On-Call Engineer**: See PagerDuty schedule
- **Tech Lead**: #syncup-tech Slack channel
- **Security Team**: security@example.com
- **Database Administrator**: dba@example.com
