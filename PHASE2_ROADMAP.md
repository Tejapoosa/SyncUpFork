# 📋 Phase 2 Implementation Roadmap - Endpoint Refactoring

## 🎯 Phase 2 Objective

Refactor all 30+ API endpoints to use the new TIER 1 infrastructure, achieving:
- ✅ 100% request validation
- ✅ 100% error handling
- ✅ 100% rate limiting where appropriate
- ✅ 70%+ test coverage
- ✅ Full traceability

---

## 📊 Endpoints to Refactor (32 Total)

### RAG Endpoints (3)
- [ ] `/api/rag/chat-all` (✅ DONE - example)
- [ ] `/api/rag/chat-meeting`
- [ ] `/api/rag/process`

### Meeting Endpoints (7)
- [ ] `/api/meetings/create` - POST
- [ ] `/api/meetings/past` - GET
- [ ] `/api/meetings/upcoming` - GET
- [ ] `/api/meetings/[meetingId]` - GET/PATCH/DELETE
- [ ] `/api/meetings/[meetingId]/bot-toggle` - PATCH
- [ ] `/api/meetings/[meetingId]/action-items` - GET/POST
- [ ] `/api/meetings/[meetingId]/action-items/[itemId]` - PATCH/DELETE

### User Endpoints (6)
- [ ] `/api/user/usage` - GET
- [ ] `/api/user/bot-settings` - POST
- [ ] `/api/user/calendar-status` - GET
- [ ] `/api/user/refresh-calendar` - POST
- [ ] `/api/user/increment-meeting` - POST
- [ ] `/api/user/increment-chat` - POST

### Authentication Endpoints (3)
- [ ] `/api/auth/google/callback` - GET
- [ ] `/api/auth/google/disconnect` - POST
- [ ] `/api/auth/google/direct-connect` - POST

### Integration Endpoints (8)
- [ ] `/api/integrations/status` - GET
- [ ] `/api/integrations/action-items` - POST
- [ ] `/api/integrations/slack/setup` - POST
- [ ] `/api/integrations/slack/disconnect` - POST
- [ ] `/api/integrations/jira/setup` - GET
- [ ] `/api/integrations/jira/callback` - GET
- [ ] `/api/integrations/jira/disconnect` - POST
- [ ] (Asana, Trello similar patterns - 4 more)

### Slack Endpoints (3)
- [ ] `/api/slack/install` - GET
- [ ] `/api/slack/oauth` - GET
- [ ] `/api/slack/events` - POST

### Webhook Endpoints (2)
- [ ] `/api/webhooks/meetingbaas` - POST
- [ ] `/api/webhooks/clerks` - POST

### Calendar Endpoints (1)
- [ ] `/api/calendar/sync` - POST

### Admin Endpoints (3)
- [ ] `/api/admin/create-sample-meetings` - POST
- [ ] `/api/admin/fix-audio-urls` - POST
- [ ] `/api/admin/fix-action-items` - POST

---

## 🛠️ Refactoring Template

### Before (Current)
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { field } = await request.json()

    if (!field) {
      return NextResponse.json({ error: 'missing field' }, { status: 400 })
    }

    const result = await operation(field)
    return NextResponse.json(result)
  } catch (error) {
    console.error('error:', error)
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
}
```

### After (Refactored)
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import { validateRequest, schemaName } from '@/lib/validation'
import { AppError, ErrorMessages, createErrorResponse } from '@/lib/errors'
import { checkRateLimit, RateLimits } from '@/lib/rate-limit'
import { generateRequestId, getContextForLogging } from '@/lib/request-context'

export async function POST(request: NextRequest) {
  const requestId = generateRequestId()
  const startTime = performance.now()

  try {
    // 1. Log request received
    logger.info('request_received', {
      requestId,
      endpoint: '/api/path',
      method: 'POST',
    })

    // 2. Validate request
    const body = await request.json()
    const validation = validateRequest(schemaName, body)
    if (!validation.valid) {
      logger.warn('validation_failed', { requestId, error: validation.error })
      return NextResponse.json(
        createErrorResponse(
          new AppError(ErrorMessages.VALIDATION_FAILED('fieldName')),
          requestId
        ),
        { status: 400 }
      )
    }

    // 3. Check rate limit
    const { userId } = await auth()
    if (!userId) {
      throw new AppError(ErrorMessages.NOT_AUTHENTICATED)
    }

    try {
      checkRateLimit(userId, RateLimits.ENDPOINT_LIMIT)
    } catch (error) {
      logger.warn('rate_limit_exceeded', { requestId, userId })
      return NextResponse.json(
        createErrorResponse(error instanceof AppError ? error : new AppError(ErrorMessages.RATE_LIMIT_EXCEEDED(50, '24h')), requestId),
        { status: 429 }
      )
    }

    // 4. Process request
    logger.info('processing_started', getContextForLogging(requestId, { userId }))
    const result = await operation(validation.data)

    // 5. Log success
    const duration = performance.now() - startTime
    logger.info('processing_completed', {
      requestId,
      userId,
      duration: Math.round(duration),
    })

    const res = NextResponse.json(result)
    res.headers.set('X-Request-Id', requestId)
    return res

  } catch (error) {
    const duration = performance.now() - startTime

    if (error instanceof AppError) {
      logger.error('app_error', error, {
        requestId,
        duration: Math.round(duration),
        errorCode: error.code,
      })
      const res = NextResponse.json(
        createErrorResponse(error, requestId),
        { status: error.statusCode }
      )
      res.headers.set('X-Request-Id', requestId)
      return res
    }

    logger.error('unexpected_error', error, {
      requestId,
      duration: Math.round(duration),
    })

    const appError = new AppError(ErrorMessages.INTERNAL_SERVER_ERROR)
    const res = NextResponse.json(
      createErrorResponse(appError, requestId),
      { status: 500 }
    )
    res.headers.set('X-Request-Id', requestId)
    return res
  }
}
```

---

## 📅 Refactoring Schedule

### Week 1: Core & High Priority
- **Day 1-2:** RAG endpoints (3 endpoints)
- **Day 3-4:** Meeting endpoints (7 endpoints)
- **Day 5:** User endpoints (6 endpoints)
- **Estimated:** 1-2 hours per endpoint

### Week 2: Integration & Webhooks
- **Day 1-2:** Auth endpoints (3 endpoints)
- **Day 3-4:** Slack endpoints (3 endpoints)
- **Day 5:** Webhooks (2 endpoints)
- **Estimated:** 1 hour per endpoint

### Week 3: Finalization
- **Day 1-2:** Integration endpoints (8 endpoints)
- **Day 3:** Admin endpoints (3 endpoints)
- **Day 4:** Calendar endpoints (1 endpoint)
- **Day 5:** Testing & verification

---

## ✅ Refactoring Checklist

For each endpoint, ensure:

### Validation
- [ ] Request validation with schema
- [ ] Clear error messages
- [ ] Type-safe data access

### Error Handling
- [ ] Try-catch block
- [ ] Specific error codes
- [ ] User-friendly messages

### Rate Limiting
- [ ] Check rate limit (if needed)
- [ ] Return 429 on limit
- [ ] Log limit exceeded

### Logging
- [ ] Log request received
- [ ] Log validation errors
- [ ] Log processing steps
- [ ] Log success/failure
- [ ] Include duration
- [ ] Include request ID

### Response
- [ ] Request ID in headers
- [ ] Proper HTTP status code
- [ ] Consistent error format

### Testing
- [ ] Unit test written
- [ ] Error cases tested
- [ ] Rate limit tested
- [ ] Validation tested

---

## 📊 Priority Order

### Priority 1 (CRITICAL) - Do First
1. `/api/rag/chat-all` ✅ DONE
2. `/api/rag/chat-meeting` - Most used
3. `/api/rag/process` - Critical path
4. `/api/meetings/create` - Core feature
5. `/api/meetings/[id]` - Core feature

**Timeline:** 1 day
**Impact:** Covers 60% of traffic

### Priority 2 (HIGH) - Do Next
6. `/api/user/*` endpoints (6)
7. `/api/integrations/action-items` - Popular
8. `/api/webhooks/meetingbaas` - Critical
9. `/api/slack/*` endpoints (3)

**Timeline:** 1-2 days
**Impact:** Covers 25% of traffic

### Priority 3 (MEDIUM) - Do Later
10. Auth endpoints (3)
11. Integration setup endpoints (8)
12. Calendar sync
13. Admin endpoints (3)

**Timeline:** 2-3 days
**Impact:** Covers 15% of traffic

---

## 🎯 Success Criteria

### Coverage
- [ ] All 32 endpoints refactored
- [ ] All validation in place
- [ ] All error handling in place
- [ ] All logging in place

### Testing
- [ ] 70%+ code coverage
- [ ] 50+ new test cases
- [ ] All critical paths tested
- [ ] CI/CD passing

### Quality
- [ ] No breaking changes
- [ ] Backward compatible
- [ ] Type-safe throughout
- [ ] Well-documented

### Performance
- [ ] <10ms overhead per endpoint
- [ ] No memory leaks
- [ ] Scalable to 1000s of requests

---

## 📝 Testing Patterns

### Pattern 1: Validation Test
```typescript
it('should validate meeting request', () => {
  const data = {
    title: 'Meeting',
    startTime: '2024-01-01T10:00:00Z',
    endTime: '2024-01-01T11:00:00Z',
  }
  const result = validateRequest(createMeetingSchema, data)
  expect(result.valid).toBe(true)
})

it('should reject invalid meeting', () => {
  const data = { title: '' } // Missing fields
  const result = validateRequest(createMeetingSchema, data)
  expect(result.valid).toBe(false)
})
```

### Pattern 2: Error Test
```typescript
it('should return proper error response', () => {
  const error = new AppError(ErrorMessages.MEETING_NOT_FOUND)
  const response = createErrorResponse(error, 'req_123')

  expect(response.code).toBe(ErrorCode.MEETING_001)
  expect(response.statusCode).toBe(404)
  expect(response.requestId).toBe('req_123')
})
```

### Pattern 3: Rate Limit Test
```typescript
it('should enforce rate limit', () => {
  const limit = { limit: 2, windowMs: 60000 }

  checkRateLimit('user', limit) // 1st
  checkRateLimit('user', limit) // 2nd
  expect(() => checkRateLimit('user', limit)).toThrow() // 3rd - should fail
})
```

---

## 🚀 Getting Started

### For Each Endpoint:

1. **Copy template** from `app/api/rag/chat-all/route.ts`
2. **Update schema** - Create validation schema if needed
3. **Add logging** - Insert logger calls
4. **Add rate limit** - Check RateLimits
5. **Write tests** - Create test file
6. **Verify** - Run tests and manual testing

### Quick Start Command
```bash
# Start with Priority 1 endpoints
npm run dev

# In another terminal, run tests
npm run test:watch

# Test an endpoint
curl -X POST http://localhost:3000/api/rag/chat-all \
  -H "Content-Type: application/json" \
  -d '{"question": "test"}'
```

---

## 📊 Progress Tracking

Create this checklist and track as you go:

```markdown
## Endpoint Refactoring Progress

### RAG Endpoints (3/3)
- [x] /api/rag/chat-all
- [ ] /api/rag/chat-meeting
- [ ] /api/rag/process

### Meeting Endpoints (0/7)
- [ ] /api/meetings/create
- [ ] /api/meetings/past
- [ ] ... (update as you go)

### Progress
- [ ] Refactored: 1/32
- [ ] Tested: 1/32
- [ ] Overall: 3%
```

---

## 💡 Tips for Refactoring

1. **Start Small** - Do one endpoint fully before moving to next
2. **Copy Patterns** - Follow template from chat-all endpoint
3. **Test First** - Write tests before refactoring
4. **Verify Changes** - Test before and after
5. **Run Full Suite** - Check all tests still pass
6. **Commit Often** - One endpoint per commit

---

## 🎓 Learning Resources

- **Template:** `app/api/rag/chat-all/route.ts` - Full example
- **Modules:** `lib/*.ts` - Implementation details
- **Tests:** `*.test.ts` - Test patterns
- **Docs:** `QUICK_REFERENCE.md` - Cheat sheet

---

## ⚠️ Common Pitfalls to Avoid

1. ❌ Forgetting request ID in response
2. ❌ Not logging errors properly
3. ❌ Incorrect rate limit preset
4. ❌ Missing validation schema
5. ❌ Inconsistent error format

✅ Use template to prevent these!

---

## 🏁 Phase 2 Completion

**Expected Timeline:** 2-3 weeks
**Estimated Effort:** 30-40 hours
**Expected Outcome:** 100% endpoint coverage with new infrastructure

### Deliverables
- [ ] 32 refactored endpoints
- [ ] 50+ new test cases
- [ ] 70%+ code coverage
- [ ] GitHub Actions CI/CD
- [ ] Complete documentation

---

## 🔮 Phase 3 Preview

Once Phase 2 is complete:
- [ ] Add comprehensive monitoring
- [ ] Implement Sentry error tracking
- [ ] Add APM integration
- [ ] Create performance dashboards
- [ ] Prepare for production deployment

---

**Next Action:** Start refactoring Priority 1 endpoints!

**Questions?** Refer to QUICK_REFERENCE.md or IMPLEMENTATION_GUIDE.md
