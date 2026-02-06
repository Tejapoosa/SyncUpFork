# SyncUp System Architecture

## High-Level Overview

SyncUp is a Next.js-based application that integrates with Slack and Google Calendar to provide meeting summaries and AI-powered chat capabilities.

### Tech Stack
- **Frontend**: Next.js 15, React, TypeScript
- **Backend**: Node.js, Next.js API Routes
- **Database**: PostgreSQL with Prisma ORM
- **AI/ML**: OpenAI API for embeddings and chat
- **External Services**: Slack API, Google Calendar API

### System Components

1. **Web Application**
   - User interface for meeting summaries
   - Chat interface
   - Settings management
   - Calendar integration dashboard

2. **API Layer**
   - RESTful endpoints for all operations
   - Real-time Slack event handling
   - OAuth flows for third-party integrations
   - RAG (Retrieval Augmented Generation) endpoints

3. **Data Layer**
   - PostgreSQL database
   - Prisma ORM for database access
   - Vector embeddings for similarity search
   - Caching layer for performance

4. **Integration Layer**
   - Slack bot integration
   - Google Calendar sync
   - OpenAI API integration
   - Webhook handlers

## API Endpoints Structure

### User APIs
- `GET /api/user/profile` - Get user profile
- `POST /api/user/profile` - Update profile
- `GET /api/user/bot-settings` - Bot configuration
- `POST /api/user/bot-settings` - Update bot settings
- `POST /api/user/refresh-calendar` - Sync calendar

### Meeting APIs
- `GET /api/meetings` - List meetings
- `GET /api/meetings/:id` - Get meeting details
- `POST /api/meetings` - Create meeting
- `DELETE /api/meetings/:id` - Delete meeting
- `POST /api/meetings/bulk-import` - Bulk import

### Chat/RAG APIs
- `POST /api/rag/chat-all` - Chat with all documents
- `POST /api/rag/chat-file` - Chat with specific file
- `GET /api/rag/documents` - List documents

### Slack APIs
- `GET /api/slack/install` - Install Slack app
- `GET /api/slack/oauth` - OAuth callback
- `POST /api/slack/events` - Handle Slack events
- `POST /api/slack/post-meeting` - Post meeting to Slack

## Database Schema Overview

### Core Tables
- **users** - User accounts
- **meetings** - Meeting records
- **documents** - Indexed documents for RAG
- **chat_sessions** - Chat conversation history
- **calendar_events** - Synced calendar events
- **integrations** - Third-party integration credentials

## Data Flow

### Meeting Summary Flow
1. Slack event received → Event handler
2. Meeting processed and summarized
3. Summary stored in database
4. Embeddings generated
5. User views in app

### Chat Flow
1. User enters query
2. RAG retrieves relevant context
3. OpenAI generates response
4. Response displayed to user
5. Conversation stored

## Security Architecture

1. **Authentication**
   - JWT token-based auth
   - OAuth 2.0 for integrations
   - Session management

2. **Authorization**
   - Role-based access control (RBAC)
   - Resource-level permissions
   - API rate limiting

3. **Data Protection**
   - Encryption at rest
   - Encryption in transit (TLS)
   - PII masking in logs

## Performance Optimization

1. **Database**
   - Indexed queries
   - Connection pooling
   - Query caching

2. **Caching**
   - Redis for sessions
   - API response caching
   - Client-side caching

3. **API**
   - Request deduplication
   - Lazy loading
   - Pagination

## Deployment Architecture

- **Platform**: Vercel (frontend) + AWS (backend)
- **Database**: RDS PostgreSQL
- **Caching**: ElastiCache Redis
- **CDN**: CloudFront
- **Monitoring**: CloudWatch

## Component Dependencies

```
├── lib/
│   ├── auth.ts - Authentication
│   ├── db.ts - Database
│   ├── logger.ts - Logging
│   ├── validation-schemas.ts - Input validation
│   ├── request-context.ts - Request tracking
│   ├── security.ts - Security utilities
│   ├── query-profiler.ts - Query performance
│   ├── n1-detector.ts - N+1 query detection
│   └── performance-baseline.ts - Performance metrics
│
├── app/api/
│   ├── user/ - User endpoints
│   ├── meetings/ - Meeting endpoints
│   ├── rag/ - RAG endpoints
│   └── slack/ - Slack integration
│
└── prisma/
    └── schema.prisma - Data model
```

## Error Handling Strategy

1. **Error Types**
   - Client errors (4xx)
   - Server errors (5xx)
   - Integration errors (external services)

2. **Error Logging**
   - Structured logging with context
   - Error tracking to monitoring service
   - PII redaction

3. **Error Recovery**
   - Automatic retry with exponential backoff
   - Circuit breaker pattern for external services
   - Graceful degradation

## Testing Strategy

1. **Unit Tests**
   - Business logic testing
   - Utility function testing

2. **Integration Tests**
   - API endpoint testing
   - Database integration
   - External service mocking

3. **E2E Tests**
   - User workflows
   - Full system flows
   - Performance testing

## Monitoring & Observability

1. **Metrics**
   - Request count and latency
   - Error rates
   - Database query performance
   - API response times

2. **Logging**
   - Structured logging
   - Request tracing
   - Error tracking

3. **Alerts**
   - High error rates
   - Performance degradation
   - Database issues
   - Integration failures
