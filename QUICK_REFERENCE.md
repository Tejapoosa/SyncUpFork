# 🚀 Quick Reference - New Improvements

## 📚 Core Modules Cheat Sheet

### 1️⃣ Logger
```typescript
import { logger } from '@/lib/logger'

logger.debug('msg', { context })
logger.info('msg', { context })
logger.warn('msg', { context })
logger.error('msg', error, { context })
logger.getLogs(100)  // Get last 100
```

### 2️⃣ Validation
```typescript
import { validateRequest, chatRequestSchema } from '@/lib/validation'

const result = validateRequest(chatRequestSchema, body)
if (result.valid) {
  const { question } = result.data  // Type-safe!
} else {
  console.error(result.error)
}
```

### 3️⃣ Error Handling
```typescript
import { AppError, ErrorMessages, createErrorResponse } from '@/lib/errors'

// Throw error
throw new AppError(ErrorMessages.MEETING_NOT_FOUND)

// Format response
const response = createErrorResponse(error, requestId)
return NextResponse.json(response, { status: error.statusCode })
```

### 4️⃣ Rate Limiting
```typescript
import { checkRateLimit, RateLimits } from '@/lib/rate-limit'

try {
  checkRateLimit(userId, RateLimits.CHAT_MESSAGES)
} catch {
  // Too many requests
}
```

### 5️⃣ Request Context
```typescript
import { generateRequestId, getContextForLogging } from '@/lib/request-context'

const requestId = generateRequestId()
logger.info('action', getContextForLogging(requestId, { duration: 100 }))
```

---

## 🔧 Common Patterns

### Pattern 1: Validate & Process
```typescript
export async function POST(request: NextRequest) {
  const validation = validateRequest(schema, await request.json())
  if (!validation.valid) {
    return NextResponse.json(
      createErrorResponse(
        new AppError(ErrorMessages.VALIDATION_FAILED('field')),
        requestId
      ),
      { status: 400 }
    )
  }
  // Use validated data
}
```

### Pattern 2: Add Rate Limiting
```typescript
try {
  checkRateLimit(userId, RateLimits.CHAT_MESSAGES)
} catch (error) {
  const appError = error instanceof AppError ? error : new AppError(ErrorMessages.RATE_LIMIT_EXCEEDED(50, '24h'))
  return NextResponse.json(createErrorResponse(appError, requestId), { status: appError.statusCode })
}
```

### Pattern 3: Structured Logging
```typescript
logger.info('request_received', { requestId, userId, endpoint })
try {
  const result = await operation()
  logger.info('operation_success', { requestId, duration: Date.now() - start })
  return NextResponse.json(result)
} catch (error) {
  logger.error('operation_failed', error, { requestId, userId })
  throw error
}
```

---

## 📊 Error Codes Quick Lookup

### Common Error Codes
| Code | Meaning | HTTP Status |
|------|---------|------------|
| `VAL_001` | Validation failed | 400 |
| `AUTH_001` | Not authenticated | 401 |
| `AUTH_002` | Unauthorized | 403 |
| `MEETING_001` | Meeting not found | 404 |
| `MEETING_002` | Meeting not processed | 202 |
| `RAG_001` | No relevant content | 404 |
| `LIMIT_001` | Rate limit exceeded | 429 |
| `DB_001` | Database error | 500 |
| `AI_001` | Ollama connection error | 503 |

---

## 🧪 Testing Commands

```bash
# Run all tests
npm run test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage

# Specific test file
npm run test -- validation.test.ts

# Specific test
npm run test -- -t "should validate"
```

---

## 📋 Pre-built Validation Schemas

| Schema | Use Case |
|--------|----------|
| `chatRequestSchema` | RAG chat requests |
| `createMeetingSchema` | Create meeting |
| `updateMeetingSchema` | Update meeting |
| `userUpdateSchema` | Update user profile |
| `integrationStatusSchema` | Check integration |
| `processRAGSchema` | Process for RAG |
| `errorResponseSchema` | Error responses |

---

## 🔐 Pre-defined Rate Limits

| Limit | Name | Amount | Period |
|-------|------|--------|--------|
| Chat | `CHAT_MESSAGES` | 50 | 24h |
| RAG Process | `RAG_PROCESS` | 10 | 1h |
| Create Meeting | `CREATE_MEETING` | 100 | 24h |
| Integration Sync | `INTEGRATION_SYNC` | 30 | 1h |
| Webhook | `WEBHOOK_PROCESS` | 1000 | 1h |

---

## 🐛 Debugging Tips

### Find Logs
```typescript
const logs = logger.getLogs(100)
logs.forEach(log => console.log(log))
```

### Check Rate Limit Status
```typescript
const status = getRateLimitStatus(userId, RateLimits.CHAT_MESSAGES)
console.log(`${status.current}/${status.limit}`)
```

### Reset Rate Limit (dev only)
```typescript
resetRateLimit(userId)
```

---

## 🚀 Implementation Workflow

1. **Validate Request**
   ```typescript
   const validation = validateRequest(schema, body)
   ```

2. **Check Rate Limit**
   ```typescript
   checkRateLimit(userId, limit)
   ```

3. **Process with Logging**
   ```typescript
   logger.info('step_1', { requestId })
   ```

4. **Handle Errors**
   ```typescript
   catch (error) {
     logger.error('failed', error, { requestId })
     throw new AppError(ErrorMessages.XXX)
   }
   ```

5. **Format Response**
   ```typescript
   const response = createErrorResponse(error, requestId)
   ```

---

## 📦 Environment Variables

### Required
- `DATABASE_URL`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `CLERK_WEBHOOK_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `PINECONE_API_KEY`
- `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET_NAME`
- `RESEND_API_KEY`

### Optional
- `SLACK_CLIENT_ID`
- `SLACK_CLIENT_SECRET`
- `NEXT_PUBLIC_APP_URL`

---

## ✅ Checklist for New Endpoints

- [ ] Add `validateRequest` call
- [ ] Add `checkRateLimit` call
- [ ] Add `logger.info` for start
- [ ] Add `logger.error` in catch
- [ ] Use `AppError` for failures
- [ ] Return `createErrorResponse` on error
- [ ] Include `requestId` in response
- [ ] Write test cases
- [ ] Check test passes

---

## 📖 More Info

- Full Guide: `IMPLEMENTATION_GUIDE.md`
- Analysis: `IMPROVEMENTS.md`
- Phase Summary: `TIER1_COMPLETE.md`
- Examples: `app/api/rag/chat-all/route.ts`

---

**Last Updated:** Feb 2, 2024
**Version:** 1.0.0
**Status:** Ready for Production
