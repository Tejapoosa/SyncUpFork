# 📅 Phase 3.2 Week 3 - Integration & Auth Testing Plan

**Status:** Ready to Implement
**Timeline:** Next Working Session
**Target:** 8-10 Endpoints, 40-50 Test Cases, 35%+ Coverage
**Current Progress:** 10/32 endpoints (31%), 168 tests (84%)

---

## 🎯 Week 3 Objectives

### Test Coverage Expansion
- Test 8-10 integration and authentication endpoints
- Write 40-50 integration test cases
- Improve coverage from 15% → 35%
- Maintain 100% test quality standards
- Build on Weeks 1-2 patterns

### Endpoints to Test (Priority Order)

#### Group A: Webhook Endpoints (2 endpoints)
1. **POST /api/webhooks/create** - Create webhook subscription
2. **GET/PATCH/DELETE /api/webhooks/[id]** - Manage webhook

#### Group B: Slack Integration Endpoints (3 endpoints)
1. **GET /api/slack/install** - Slack app install
2. **POST /api/slack/oauth** - OAuth callback handler
3. **POST /api/slack/events** - Event subscription handler

#### Group C: Auth/OAuth Endpoints (3 endpoints)
1. **GET /api/auth/google/callback** - Google OAuth callback
2. **POST /api/auth/google/direct-connect** - Direct Google connection
3. **POST /api/auth/google/disconnect** - Disconnect Google account

#### Group D: Additional Integration (2 endpoints) - Optional
1. **POST /api/integrations/status** - Check integration status
2. **GET /api/calendar/sync** - Sync calendar with Google

---

## 📊 Test Plan by Endpoint Type

### Webhook Endpoints (2) - Estimated 16 test cases

#### Create Webhook (8 tests):
```
1. ✅ Create valid webhook with URL
2. ✅ Validate webhook URL format
3. ✅ Validate event types array
4. ✅ Check webhook count limit per user
5. ✅ Test authentication required (401)
6. ✅ Test authorization (user ownership)
7. ✅ Handle database errors
8. ✅ Include requestId in response
```

#### Manage Webhook (8 tests):
```
1. ✅ Get webhook details successfully
2. ✅ Update webhook (URL, events, etc.)
3. ✅ Delete webhook successfully
4. ✅ Verify user ownership (403 if not owner)
5. ✅ Handle webhook not found (404)
6. ✅ Test authentication (401)
7. ✅ Database error handling
8. ✅ Include requestId tracking
```

**Estimated Test Cases:** 16 (2 × 8)

---

### Slack Integration Endpoints (3) - Estimated 20 test cases

#### Slack Install (6 tests):
```
1. ✅ Retrieve install URL for Slack app
2. ✅ Validate Slack app configuration
3. ✅ Check user authentication
4. ✅ Return correct scopes
5. ✅ Handle Slack API errors
6. ✅ Include requestId in response
```

#### Slack OAuth (8 tests):
```
1. ✅ Handle valid OAuth callback
2. ✅ Validate code parameter
3. ✅ Validate state parameter (CSRF)
4. ✅ Exchange code for token
5. ✅ Save workspace configuration
6. ✅ Handle invalid/expired code (400)
7. ✅ Handle state mismatch (CSRF attack)
8. ✅ Handle Slack API errors gracefully
```

#### Slack Events (6 tests):
```
1. ✅ Verify request signature
2. ✅ Handle challenge verification
3. ✅ Process meeting.updated event
4. ✅ Process message events
5. ✅ Handle invalid signatures (401)
6. ✅ Database error handling
```

**Estimated Test Cases:** 20 (6 + 8 + 6)

---

### Auth/OAuth Endpoints (3) - Estimated 20 test cases

#### Google OAuth Callback (8 tests):
```
1. ✅ Handle valid authorization code
2. ✅ Validate code parameter
3. ✅ Validate state parameter (CSRF)
4. ✅ Exchange code for tokens
5. ✅ Save calendar connection
6. ✅ Handle invalid code (400)
7. ✅ Handle state mismatch (CSRF)
8. ✅ Handle Google API errors
```

#### Direct Google Connect (8 tests):
```
1. ✅ Validate authorization code
2. ✅ Exchange for Google tokens
3. ✅ Mark calendar as connected
4. ✅ Test authentication required (401)
5. ✅ Handle invalid tokens (400)
6. ✅ Handle Google API errors
7. ✅ Prevent duplicate connections
8. ✅ Include requestId tracking
```

#### Google Disconnect (4 tests):
```
1. ✅ Disconnect calendar successfully
2. ✅ Clear stored tokens
3. ✅ Test authentication required (401)
4. ✅ Mark calendar as disconnected
```

**Estimated Test Cases:** 20 (8 + 8 + 4)

---

## 🛠️ Implementation Strategy

### Phase 1: Webhook Endpoints (Days 1-2)

#### Day 1:
```
Create webhook tests:
- app/api/webhooks/webhooks.test.ts  (16 tests)

Total: 16 tests
Time: ~2-3 hours
Focus: CRUD operations, validation
```

#### Day 2:
```
Review and refine webhook tests
Run full test suite
Verify webhook patterns
Update documentation
```

### Phase 2: Slack Integration (Days 3-4)

```
Create Slack tests:
- app/api/slack/slack.test.ts  (20 tests)

Includes:
├─ Slack install flow
├─ OAuth callback handling
├─ Event signature verification
└─ Slack API error handling

Time: ~3-4 hours
Focus: OAuth flows, signature verification
```

### Phase 3: Auth/OAuth (Days 5-6)

```
Create Auth tests:
- app/api/auth/google.test.ts  (20 tests)

Includes:
├─ OAuth callback validation
├─ Token exchange
├─ Calendar connection/disconnection
└─ CSRF protection

Time: ~3-4 hours
Focus: CSRF protection, token handling
```

### Phase 4: Integration & Review (Day 7)

```
Optional additional endpoints:
- Integration status checking
- Calendar sync endpoint
- Edge case coverage
- Performance validation

Time: ~2-3 hours
```

---

## 📋 Test Implementation Checklist

### Pre-Implementation
- [ ] Review Week 1-2 test patterns
- [ ] Study endpoint documentation
- [ ] Identify mock requirements
- [ ] Prepare test data builders
- [ ] Set up crypto/security mocks

### Webhook Endpoints
- [ ] Create webhook tests (16)
- [ ] Test CRUD operations
- [ ] Test validation
- [ ] Test ownership verification

### Slack Integration
- [ ] Test install endpoint (6)
- [ ] Test OAuth callback (8)
- [ ] Test event handler (6)
- [ ] Test signature verification
- [ ] Test CSRF protection

### Auth/OAuth
- [ ] Test Google OAuth flow (8)
- [ ] Test direct connect (8)
- [ ] Test disconnect (4)
- [ ] Test CSRF protection
- [ ] Test token handling

### Integration & Validation
- [ ] All tests passing
- [ ] No flaky tests
- [ ] <5 second execution
- [ ] Clear test names
- [ ] Good documentation

---

## 🎯 Success Criteria for Week 3

### Coverage Goals
```
Current: 15% overall, 31% endpoints (10/32)
Week 3 Target: 35% overall
├─ Foundation: 100% ✅
├─ Critical (5): 100% ✅
├─ User (6): 100% ✅
├─ Webhooks (2): 100% (NEW)
├─ Integration (5): 100% (NEW)
└─ Total tested: 18/32 endpoints (56%)
```

### Quality Standards
- [x] 100% test passing rate
- [x] No flaky tests
- [x] Professional patterns
- [x] Clear documentation
- [x] Fast execution (<5s)

### Test Metrics
- [x] 40-50 new test cases
- [x] 218+ cumulative tests
- [x] All error scenarios covered
- [x] CSRF protection tested
- [x] OAuth flows validated
- [x] Request ID in all tests

---

## 📊 Coverage Progression

### By Week
```
Week 1 Complete:
├─ 5 endpoints tested (16%)
├─ 35 test cases
├─ ~8% overall coverage
└─ Foundation: 100%

Week 2 Complete:
├─ 5 endpoints tested (16%) [NEW]
├─ 50 test cases
├─ ~15% overall coverage
└─ User endpoints: 100%

Week 3 Target:
├─ 8 endpoints tested (25%) [NEW]
├─ 40-50 new test cases
├─ ~35% overall coverage
└─ 18/32 endpoints (56%)

Week 4 Final:
├─ 14+ endpoints tested (44%) [NEW]
├─ 35+ new test cases
├─ ~70%+ overall coverage
└─ 32/32 endpoints (100%)
```

---

## 🔧 Test Files to Create

### Week 3 Deliverables (8 files max)

```
Week 3 Test Files:

1. app/api/webhooks/webhooks.test.ts
   ├─ POST /create - Create webhook
   ├─ GET /[id] - Get webhook
   ├─ PATCH /[id] - Update webhook
   ├─ DELETE /[id] - Delete webhook
   └─ 16 test cases

2. app/api/slack/slack.test.ts
   ├─ GET /install - Get install URL
   ├─ POST /oauth - OAuth callback
   ├─ POST /events - Event handler
   └─ 20 test cases

3. app/api/auth/google.test.ts
   ├─ GET /callback - OAuth callback
   ├─ POST /direct-connect - Direct connect
   ├─ POST /disconnect - Disconnect
   └─ 20 test cases

Total: 3 files, 56 test cases

Optional:
4. app/api/integrations/integrations.test.ts
5. app/api/calendar/calendar.test.ts
```

---

## 🔐 Security Testing Focus

### CSRF Protection
```
Test Cases:
- ✅ Validate state parameter on OAuth
- ✅ Reject requests with invalid state
- ✅ Verify state is properly generated
- ✅ Prevent cross-site forgery attempts
```

### Signature Verification
```
Test Cases:
- ✅ Verify Slack signature validation
- ✅ Reject invalid signatures
- ✅ Verify timestamp validation
- ✅ Prevent request replay
```

### Token Security
```
Test Cases:
- ✅ Securely store tokens
- ✅ Clear tokens on disconnect
- ✅ Validate token expiry
- ✅ Handle token refresh
```

---

## 📝 Pattern Review

### OAuth Flow Pattern
```typescript
describe('OAuth Endpoint', () => {
  it('should validate state parameter', async () => {
    // Verify CSRF protection
  });

  it('should exchange code for token', async () => {
    // Test token exchange
  });

  it('should handle errors gracefully', async () => {
    // Test error paths
  });
});
```

### Webhook Pattern
```typescript
describe('Webhook Endpoint', () => {
  it('should validate URL format', async () => {
    // Test URL validation
  });

  it('should check ownership', async () => {
    // Test authorization
  });

  it('should enforce limits', async () => {
    // Test rate limiting
  });
});
```

### Event Handler Pattern
```typescript
describe('Event Handler', () => {
  it('should verify signature', async () => {
    // Test request authentication
  });

  it('should process valid events', async () => {
    // Test event handling
  });

  it('should handle unsupported events', async () => {
    // Test unknown event types
  });
});
```

---

## 🚀 Execution Timeline

### Estimated Hours
```
Day 1-2: Webhook endpoints        3-4 hours
Day 3-4: Slack integration        4-5 hours
Day 5-6: Auth/OAuth               4-5 hours
Day 7: Integration & review       2-3 hours
─────────────────────────────────────────────
Total: 13-17 hours (including review)
```

### Daily Breakdown
```
Days 1-2: Webhooks (3-4 hours)
├─ Create 1 test file
├─ 16 test cases
├─ Review and refine

Days 3-4: Slack (4-5 hours)
├─ Create 1 test file
├─ 20 test cases
├─ Signature verification focus

Days 5-6: Auth (4-5 hours)
├─ Create 1 test file
├─ 20 test cases
├─ CSRF protection focus

Day 7: Integration (2-3 hours)
├─ Optional endpoints
├─ Edge cases
├─ Performance testing
├─ Final review

Total: 13-17 hours
```

---

## ✅ Sign-Off Criteria

### Must Complete
- [ ] All 40-50 test cases written
- [ ] All tests passing
- [ ] No flaky tests
- [ ] Documentation complete
- [ ] Code reviewed
- [ ] Coverage verified (35%+)
- [ ] Security testing complete

### Ready for Week 4
- [ ] Test patterns documented
- [ ] Mock strategy consistent
- [ ] Week 4 plan finalized
- [ ] Identified remaining gaps

---

## 📊 Success Metrics

| Metric | Target | Week 2 | Week 3 Target |
|--------|--------|--------|---------------|
| Endpoints Tested | 8-10 | 10 | 18 |
| Test Cases | 40-50 | 168 | 218+ |
| Coverage | 35% | 15% | 35% |
| Test Quality | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Execution Time | <5s | <2s | <5s |
| Documentation | Complete | Complete | Complete |

---

## 📞 Notes for Session

### Key Reminders
1. CSRF protection is critical for OAuth endpoints
2. Webhook validation must test all edge cases
3. Slack signature verification is essential
4. Token handling requires special care
5. Follow existing patterns exactly

### Resources Available
- Week 1-2 tests as reference
- test-helpers.ts for utilities
- jest.config.js for settings
- Patterns from Phase 1-2

### Common Pitfalls to Avoid
- ❌ Missing CSRF validation tests
- ❌ Incomplete OAuth flow testing
- ❌ No signature verification tests
- ❌ Missing state parameter validation
- ❌ No token cleanup testing
- ❌ Incomplete error scenario coverage

---

## 🎓 Learning Resources

### OAuth Security
- RFC 6749 - Authorization Framework
- RFC 7636 - PKCE Extension
- OWASP CSRF Prevention

### Webhook Security
- Signature verification patterns
- Rate limiting strategies
- Retry logic

### Integration Patterns
- Error handling in third-party APIs
- Token refresh strategies
- Fallback mechanisms

---

## 🔄 Dependency Management

### Before Starting Week 3
```
✅ Week 1 tests passing
✅ Week 2 tests passing
✅ All fixtures prepared
✅ Mock libraries ready
✅ Test data builders functional
```

### For Each Endpoint
```
1. Identify auth requirements
2. Prepare OAuth mocks
3. Verify external API mocks
4. Set up database mocks
5. Plan test data flow
```

---

**Plan Ready:** ✅
**Confidence Level:** ⭐⭐⭐⭐⭐
**Next Phase:** Week 3 Implementation

---
