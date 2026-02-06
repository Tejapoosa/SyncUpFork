# Developer Handbook

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Redis (optional for caching)
- Git

### Initial Setup

1. **Clone and Install**
```bash
git clone https://github.com/teja-afk/SyncUp.git
cd SyncUp
npm install
```

2. **Environment Setup**
```bash
cp .env.example .env.local
# Edit .env.local with your credentials
```

3. **Database Setup**
```bash
npx prisma generate
npx prisma migrate dev
npx prisma db seed
```

4. **Start Development**
```bash
npm run dev
# App runs on http://localhost:3000
```

## Code Organization

```
├── app/
│   ├── page.tsx - Home page
│   ├── layout.tsx - Root layout
│   ├── api/ - API routes
│   │   ├── user/ - User endpoints
│   │   ├── meetings/ - Meeting endpoints
│   │   ├── rag/ - RAG endpoints
│   │   └── slack/ - Slack integration
│   ├── components/ - Page components
│   └── [id]/ - Dynamic routes
│
├── components/ - Reusable components
│   ├── ui/ - UI components
│   ├── forms/ - Form components
│   └── layouts/ - Layout components
│
├── lib/ - Utility functions
│   ├── auth.ts - Authentication
│   ├── db.ts - Database
│   ├── logger.ts - Logging
│   ├── security.ts - Security
│   └── validation-schemas.ts - Validation
│
├── hooks/ - React hooks
├── prisma/ - Database schema
├── public/ - Static files
└── styles/ - CSS files
```

## Coding Standards

### TypeScript
- Use strict mode: `"strict": true` in tsconfig.json
- Type all function parameters and returns
- Avoid `any` type - use `unknown` with proper guards
- Use interfaces for object shapes

### Naming Conventions
- **Files**: `kebab-case.ts`
- **Components**: `PascalCase.tsx`
- **Functions**: `camelCase`
- **Constants**: `UPPER_SNAKE_CASE`
- **Types/Interfaces**: `PascalCase`

### Comment Style
- Only comment complex logic
- Use JSDoc for public APIs
- Keep comments up-to-date

### Error Handling
```typescript
try {
  // operation
} catch (error) {
  logger.error('Operation failed', {
    error,
    context: 'relevant_context',
    userId: user?.id,
  });
  throw new AppError('User-friendly message', 'ERROR_CODE');
}
```

## Testing Guide

### Running Tests
```bash
# All tests
npm test

# Specific test file
npm test -- validation.test.ts

# With coverage
npm test -- --coverage

# Watch mode
npm test -- --watch
```

### Test Structure
```typescript
describe('Module Name', () => {
  describe('Function Name', () => {
    it('should do something specific', () => {
      // Arrange
      const input = { /* setup */ };

      // Act
      const result = functionUnderTest(input);

      // Assert
      expect(result).toBe(expected);
    });
  });
});
```

### Mocking External Services
```typescript
jest.mock('lib/db.ts');

const mockDb = require('lib/db.ts') as jest.Mocked<typeof db>;
mockDb.user.findUnique.mockResolvedValue({
  id: '1',
  email: 'test@example.com',
});
```

## API Development

### Creating New Endpoints

1. **Create route file** at `app/api/resource/action/route.ts`
2. **Implement handler**:
```typescript
import { validateRequest } from 'lib/validation-schemas';
import { logger } from 'lib/logger';
import { handleError } from 'lib/error-handler';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const validated = validateRequest(data, schema);

    // Implementation

    return Response.json({ success: true, data });
  } catch (error) {
    return handleError(error);
  }
}
```

3. **Add validation schema** in `lib/validation-schemas.ts`
4. **Add tests** in `resource.test.ts`
5. **Document** in API docs

### Error Responses
```typescript
// 400 Bad Request
Response.json({ error: 'Validation failed' }, { status: 400 })

// 401 Unauthorized
Response.json({ error: 'Unauthorized' }, { status: 401 })

// 404 Not Found
Response.json({ error: 'Not found' }, { status: 404 })

// 500 Server Error
Response.json({ error: 'Internal error' }, { status: 500 })
```

## Database Operations

### Using Prisma

```typescript
// Create
const user = await db.user.create({
  data: { email: 'user@example.com' }
});

// Read
const user = await db.user.findUnique({
  where: { id: userId }
});

// Update
const user = await db.user.update({
  where: { id: userId },
  data: { email: 'new@example.com' }
});

// Delete
await db.user.delete({
  where: { id: userId }
});

// Query with relations
const user = await db.user.findUnique({
  where: { id: userId },
  include: { meetings: true }
});
```

### Query Performance
- Always use `.select()` to limit fields
- Avoid N+1 queries with `.include()`
- Use `.distinct()` for deduplication
- Index frequently queried fields

## Debugging

### Local Debugging
```bash
# With VS Code debugger
# Set breakpoint and run
node --inspect-brk ./node_modules/.bin/jest --runInBand

# Console debugging
console.log({ variable, context });
logger.debug('Debug message', { data });
```

### Production Logs
```bash
# View logs
npm run logs:production

# Search logs
npm run logs:search -- "error" --limit 100
```

## Deployment

### Pre-Deployment Checklist
- [ ] All tests passing
- [ ] No TypeScript errors
- [ ] Code reviewed
- [ ] Documentation updated
- [ ] Environment variables set

### Deployment Steps
```bash
# Build
npm run build

# Test build locally
npm run dev

# Deploy to staging
npm run deploy:staging

# Deploy to production
npm run deploy:production
```

## Common Tasks

### Adding a New Environment Variable
1. Add to `.env.example`
2. Add type to `lib/env.ts`
3. Document in `OPERATIONS_GUIDE.md`
4. Update CI/CD secrets

### Adding a New Database Migration
```bash
npx prisma migrate dev --name add_feature_name
# Review generated migration
npm test -- db.test.ts
```

### Adding a New API Endpoint
1. Create route file
2. Add validation schema
3. Implement handler
4. Write tests
5. Update API docs

### Debugging Database Issues
```bash
# Check database connection
npm run db:check

# View database schema
npx prisma studio

# Check for N+1 queries
npm run profile:queries

# View slow queries
npm run analyze:slow-queries
```

## Performance Tips

1. **Database**
   - Use indexes on frequently queried fields
   - Pagination for large result sets
   - Select specific fields needed

2. **API**
   - Cache frequently accessed data
   - Compress responses
   - Use pagination

3. **Frontend**
   - Lazy load components
   - Optimize images
   - Code splitting

## Security Checklist

- [ ] No hardcoded secrets
- [ ] Input validation on all endpoints
- [ ] SQL injection protection (Prisma)
- [ ] CSRF protection enabled
- [ ] Rate limiting applied
- [ ] CORS properly configured
- [ ] HTTPS enforced

## Getting Help

- **Documentation**: Check ARCHITECTURE.md and OPERATIONS_GUIDE.md
- **Issues**: Check GitHub issues
- **Questions**: Ask in team Slack channel
- **Debugging**: Use logger and VS Code debugger

## Useful Commands

```bash
# Development
npm run dev              # Start dev server
npm test                 # Run tests
npm run lint            # Lint code
npm run type-check      # Type checking

# Database
npx prisma migrate dev  # Create migration
npx prisma studio      # Open data browser
npx prisma generate    # Generate Prisma client

# Deployment
npm run build           # Build for production
npm run deploy:staging  # Deploy to staging
npm run deploy:prod     # Deploy to production

# Debugging
npm run profile:queries # Profile database queries
npm run analyze:logs    # Analyze logs
```
