# 📚 Complete Project Documentation - Meeting Bot

## 🎯 Executive Summary

**Meeting Bot** is a comprehensive AI-powered meeting management platform that automates the entire meeting lifecycle - from automatic recording and transcription to intelligent search and actionable insights. Built with modern web technologies and local AI processing, it provides enterprise-grade features while maintaining privacy and cost-effectiveness.

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture & Technology Stack](#architecture--technology-stack)
3. [System Architecture](#system-architecture)
4. [Data Models & Database Schema](#data-models--database-schema)
5. [Core Features & Components](#core-features--components)
6. [API Endpoints](#api-endpoints)
7. [Data Flow & Workflows](#data-flow--workflows)
8. [External Integrations](#external-integrations)
9. [Development Setup](#development-setup)
10. [Deployment & Production](#deployment--production)
11. [Security & Privacy](#security--privacy)
12. [Testing Strategy](#testing-strategy)
13. [Troubleshooting](#troubleshooting)

---

## 1. Project Overview

### What is Meeting Bot?

Meeting Bot is an intelligent SaaS platform that:
- **Automatically joins** your video meetings (Zoom, Google Meet, Teams)
- **Records and transcribes** conversations in real-time
- **Generates AI summaries** and extracts action items
- **Enables semantic search** across all meeting history using RAG
- **Integrates** with calendar, chat, and project management tools
- **Sends notifications** with summaries and follow-ups

### Problem Statement

Organizations struggle with:
- Manual note-taking during meetings
- Lost context and action items
- Inability to search past meeting discussions
- Time spent on post-meeting documentation
- Coordination across multiple platforms

### Solution

Meeting Bot automates the entire meeting workflow, providing:
- Zero-effort meeting documentation
- AI-powered intelligent search
- Automatic action item tracking
- Cross-platform integration
- Privacy-first local AI processing

---

## 2. Architecture & Technology Stack

### Frontend Stack
```
Next.js 15.5.3 (React 19.1.0)
├── TypeScript 5.x
├── Tailwind CSS 4.x
├── Radix UI Components
├── Lucide Icons
└── React Hooks + Context API
```

### Backend Stack
```
Node.js Runtime
├── Next.js API Routes
├── Clerk Authentication
├── Prisma ORM 6.16.1
└── PostgreSQL (Neon)
```

### AI/ML Stack
```
Ollama (Local AI)
├── Mistral (Chat/Summarization)
├── Llama2 (Fallback LLM)
├── Nomic Embed Text (768-dim embeddings)
└── Pinecone Vector Database
```

### Cloud Services
```
AWS
├── S3 (Audio Storage)
└── Lambda (Calendar Sync, Slack Bot)

Third-Party APIs
├── MeetingBaaS (Recording)
├── Google Calendar
├── Slack API
├── Jira/Asana/Trello APIs
└── Resend/Gmail (Email)
```

### Development Tools
```
Build Tools
├── Turbopack (Next.js bundler)
├── ESLint 9
└── PostCSS 4

Database Tools
├── Prisma CLI
└── Prisma Studio
```

---

## 3. System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (Next.js)                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │Dashboard │  │ Chat UI  │  │ Meetings │  │Integrations│ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  │
└───────┼─────────────┼─────────────┼─────────────┼─────────┘
        │             │             │             │
        ▼             ▼             ▼             ▼
┌─────────────────────────────────────────────────────────────┐
│                   Next.js API Routes                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ /api/rag/*   │  │/api/meetings/│  │/api/webhooks/│     │
│  │ Chat & RAG   │  │   CRUD       │  │  Callbacks   │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
└─────────┼──────────────────┼──────────────────┼─────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                      Core Services                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ AI Processor │  │ RAG Engine   │  │ Integrations │     │
│  │(lib/*.ts)    │  │(lib/rag.ts)  │  │(lib/integr..)│     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
└─────────┼──────────────────┼──────────────────┼─────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                   External Services                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │  Ollama  │  │ Pinecone │  │PostgreSQL│  │   AWS S3 │  │
│  │(Local AI)│  │ (Vectors)│  │  (Data)  │  │  (Audio) │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Component Breakdown

#### Frontend Components (`/app`, `/components`, `/hooks`)
- **Pages**: Home dashboard, chat interface, meeting details, settings
- **Layouts**: Authenticated layouts with sidebar navigation
- **UI Components**: Audio player, meeting cards, action item lists
- **Custom Hooks**: `useMeetings`, `useChatAll`, `useIntegrations`
- **Contexts**: Usage tracking, authentication state

#### API Layer (`/app/api/*`)
- **RAG Endpoints**: Chat, embedding generation, vector search
- **Meeting Endpoints**: CRUD operations, bot controls
- **Integration Endpoints**: OAuth flows, action item sync
- **Webhook Endpoints**: MeetingBaaS callbacks, Clerk events
- **Admin Endpoints**: Sample data creation, bulk operations

#### Core Business Logic (`/lib/*`)
- **AI Processing**: Transcript analysis, summary generation
- **RAG Engine**: Embedding creation, semantic search, context retrieval
- **Integration Managers**: Platform-specific APIs (Jira, Asana, etc.)
- **Utilities**: Text chunking, email templates, usage tracking

#### Database Layer (`/prisma`)
- **Schema Definition**: User, Meeting, TranscriptChunk, Integrations
- **Migrations**: Schema versioning and updates
- **Client Generation**: Type-safe database access

#### AWS Lambda Functions
- **lambda-function**: Calendar polling, bot scheduling
- **lambda-chat**: Slack bot message handling

---

## 4. Data Models & Database Schema

### Entity Relationship Diagram

```
┌─────────────┐         ┌─────────────────┐         ┌──────────────────┐
│    User     │1      ∞ │    Meeting      │1      ∞ │TranscriptChunk  │
│─────────────│─────────│─────────────────│─────────│──────────────────│
│ id (PK)     │         │ id (PK)         │         │ id (PK)          │
│ clerkId     │         │ userId (FK)     │         │ meetingId (FK)   │
│ email       │         │ title           │         │ chunkIndex       │
│ name        │         │ transcript      │         │ content          │
│ googleTokens│         │ summary         │         │ speakerName      │
│ slackInfo   │         │ actionItems     │         │ vectorId         │
│ currentPlan │         │ recordingUrl    │         │                  │
│ usage       │         │ ragProcessed    │         │                  │
└─────────────┘         └─────────────────┘         └──────────────────┘
       │1                                                      
       │                                                       
       │∞                                                      
┌─────────────────┐                  ┌──────────────────────┐
│UserIntegration  │                  │ SlackInstallation    │
│─────────────────│                  │──────────────────────│
│ id (PK)         │                  │ id (PK)              │
│ userId (FK)     │                  │ teamId (UNIQUE)      │
│ platform        │                  │ teamName             │
│ accessToken     │                  │ botToken             │
│ refreshToken    │                  │ installedBy          │
│ expiresAt       │                  │ active               │
│ projectId/boardId│                 │                      │
└─────────────────┘                  └──────────────────────┘
```

### Schema Details

#### User Model
```prisma
model User {
  id       String    @id
  clerkId  String    @unique
  email    String?
  name     String?
  
  // Bot Configuration
  botName     String? @default("Meeting Bot")
  botImageUrl String?
  
  // OAuth Tokens
  googleAccessToken  String?
  googleRefreshToken String?
  googleTokenExpiry  DateTime?
  calenderConnected  Boolean @default(false)
  
  // Slack Integration
  slackUserId          String?
  slackTeamId          String?
  slackConnected       Boolean @default(false)
  preferredChannelId   String?
  preferredChannelName String?
  
  // Usage & Plan (Post-Stripe Removal)
  currentPlan          String  @default("premium")
  meetingsThisMonth    Int     @default(0)
  chatMessagesToday    Int     @default(0)
  
  meetings Meeting[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

**Key Points:**
- `clerkId`: Links to Clerk authentication system
- OAuth tokens stored for Google Calendar integration
- Slack workspace/user linkage
- Free premium plan for all users (Stripe removed)
- Usage tracking for meetings and chat

#### Meeting Model
```prisma
model Meeting {
  id          String   @id @default(cuid())
  userId      String
  title       String
  description String?
  meetingUrl  String?
  startTime   DateTime
  endTime     DateTime
  attendees   Json?
  
  // Calendar Integration
  calendarEventId String? @unique
  isFromCalendar  Boolean @default(false)
  
  // Bot Recording
  botScheduled Boolean   @default(true)
  botSent      Boolean   @default(false)
  botId        String?
  botJoinedAt  DateTime?
  
  // Transcript & Recording
  meetingEnded    Boolean @default(false)
  transcriptReady Boolean @default(false)
  transcript      Json?
  recordingUrl    String?
  speakers        Json?
  
  // AI Processing
  summary        String?
  actionItems    Json?
  processed      Boolean   @default(false)
  processedAt    DateTime?
  emailSent      Boolean   @default(false)
  emailSentAt    DateTime?
  ragProcessed   Boolean   @default(false)
  ragProcessedAt DateTime?
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  TranscriptChunk TranscriptChunk[]
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

**Key Points:**
- Tracks complete meeting lifecycle
- Links to calendar events
- Records bot deployment status
- Stores transcript and AI-generated content
- Processing flags for various stages

#### TranscriptChunk Model
```prisma
model TranscriptChunk {
  id          String   @id @default(cuid())
  meetingId   String
  chunkIndex  Int
  content     String   @db.Text
  speakerName String?
  vectorId    String?
  
  meeting   Meeting  @relation(fields: [meetingId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
}
```

**Key Points:**
- Breaks transcripts into searchable segments
- Links to Pinecone vectors via `vectorId`
- Preserves speaker attribution
- Ordered by `chunkIndex`

#### UserIntegration Model
```prisma
model UserIntegration {
  id           String    @id @default(cuid())
  userId       String
  platform     String    // "jira", "asana", "trello"
  accessToken  String    @db.Text
  refreshToken String?   @db.Text
  expiresAt    DateTime?
  
  // Platform-specific IDs
  boardId     String?
  boardName   String?
  projectId   String?
  projectName String?
  workspaceId String?
  domain      String?
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@unique([userId, platform])
}
```

**Key Points:**
- Manages OAuth tokens for third-party platforms
- Platform-specific configuration storage
- Automatic token refresh support

#### SlackInstallation Model
```prisma
model SlackInstallation {
  id            String   @id @default(cuid())
  teamId        String   @unique
  teamName      String
  botToken      String   @db.Text
  installedBy   String
  installerName String?
  active        Boolean  @default(true)
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

**Key Points:**
- Workspace-level Slack installations
- Bot token for API access
- Installation tracking

---

## 5. Core Features & Components

### 🎙️ Meeting Recording & Transcription

**How it works:**
1. User connects Google Calendar → Lambda polls for upcoming meetings
2. MeetingBaaS bot scheduled 5 minutes before meeting
3. Bot joins, records audio → uploads to S3
4. Webhook delivers transcript to `/api/webhooks/meetingbaas`
5. Transcript parsed and stored in database

**Key Files:**
- `lambda-function/index.js` - Calendar polling
- `app/api/webhooks/meetingbaas/route.ts` - Webhook handler
- `lib/ai-processor.ts` - Transcript processing

### 🤖 AI-Powered Summarization

**How it works:**
1. Transcript received from webhook
2. `processMeetingTranscript()` called with Ollama
3. Prompts extract summary and action items
4. Results stored in Meeting record
5. Email sent via Resend/Gmail

**Key Files:**
- `lib/ai-processor.ts` - AI processing logic
- `lib/openai.ts` - Ollama integration
- `lib/email-service-free.tsx` - Email templates

### 💬 RAG (Retrieval Augmented Generation) Chat

**Architecture:**
```
User Question
    ↓
Generate Embedding (Ollama nomic-embed-text)
    ↓
Search Pinecone (semantic similarity)
    ↓
Retrieve Top-K Chunks (with metadata filters)
    ↓
Build Context Prompt
    ↓
LLM Generates Answer (Ollama Mistral/Llama2)
    ↓
Return Answer + Citations
```

**Key Files:**
- `lib/rag.ts` - Main RAG orchestration
- `lib/pinecone.ts` - Vector search client
- `lib/text-chunker.ts` - Transcript chunking
- `app/api/rag/chat-all/route.ts` - Cross-meeting chat
- `app/api/rag/chat-meeting/route.ts` - Single meeting chat

**RAG Processing Flow:**
1. `chunkTranscriptText()` - Split transcript into 500-char segments
2. For each chunk:
   - Generate 768-dim embedding via Ollama
   - Store in Pinecone with metadata (meetingId, userId, speaker, content)
3. Mark meeting as `ragProcessed: true`

**Chat Query Flow:**
1. User asks question
2. Question embedded via Ollama
3. Pinecone query with filters (userId, optional meetingId)
4. Top-5 chunks retrieved
5. Context assembled: meeting titles + chunk contents + speakers
6. LLM prompt: "Answer based on this context..."
7. Response returned with source citations

### 🔗 Google Calendar Integration

**OAuth Flow:**
1. User clicks "Connect Calendar"
2. Redirect to `/api/auth/google/callback`
3. Exchange code for tokens
4. Store tokens in User model
5. Lambda polls calendar every 5 minutes

**Key Files:**
- `app/api/auth/google/callback/route.ts` - OAuth callback
- `app/api/auth/google/direct-connect/route.ts` - Direct connect
- `app/api/auth/google/disconnect/route.ts` - Disconnect
- `app/api/calendar/sync/route.ts` - Manual sync
- `lib/integrations/google-calendar.ts` - Calendar API wrapper

### 💬 Slack Integration

**Features:**
- Receive meeting summaries in Slack channels
- Chat with Meeting Bot via DM or @mention
- Automatic action item notifications

**Implementation:**
- Workspace installation via Slack OAuth
- Event subscriptions for messages and mentions
- Lambda function processes Slack events
- Bot uses RAG to answer questions

**Key Files:**
- `app/api/slack/oauth/route.ts` - OAuth flow
- `app/api/slack/events/route.ts` - Event handler
- `app/api/slack/events/handlers/message.ts` - DM handler
- `app/api/slack/events/handlers/app-mention.ts` - @mention handler
- `app/api/slack/post-meeting/route.ts` - Summary posting
- `lambda-chat/lambda-chat-reset.js` - AWS Lambda event processor

### 🎫 Action Item Sync

**Supported Platforms:**
- **Jira**: Create issues with description, assignee, due date
- **Asana**: Create tasks in projects with custom fields
- **Trello**: Create cards on boards with labels

**Flow:**
1. AI extracts action items from transcript
2. User selects items to sync
3. Platform API called with OAuth token
4. Item created in target system
5. Link stored in Meeting record

**Key Files:**
- `lib/integrations/jira.ts` - Jira API client
- `lib/integrations/asana.ts` - Asana API client
- `lib/integrations/trello.ts` - Trello API client
- `app/api/integrations/action-items/route.ts` - Sync endpoint

### 📧 Email Notifications

**Email Types:**
1. **Meeting Summary**: Sent after transcript processed
2. **Action Items**: List of assigned tasks
3. **Calendar Reminders**: Upcoming meetings with bot status

**Implementation:**
- React Email for HTML templates
- Nodemailer (Gmail) or Resend API
- Customizable templates in `lib/email-service-free.tsx`

---

## 6. API Endpoints

### Authentication & User Management

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/google/callback` | GET | Google OAuth callback |
| `/api/auth/google/direct-connect` | POST | Direct calendar connection |
| `/api/auth/google/disconnect` | POST | Disconnect Google Calendar |
| `/api/user/usage` | GET | Get user plan and usage stats |
| `/api/user/increment-chat` | POST | Track chat message count |

### Meeting Management

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/meetings/past` | GET | List past meetings |
| `/api/meetings/upcoming` | GET | List upcoming meetings |
| `/api/meetings/[id]` | GET | Get meeting details |
| `/api/meetings/[id]` | PATCH | Update meeting |
| `/api/meetings/[id]` | DELETE | Delete meeting |
| `/api/meetings/[id]/bot-toggle` | POST | Enable/disable bot |

### RAG & Chat

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/rag/chat-all` | POST | Chat across all meetings |
| `/api/rag/chat-meeting` | POST | Chat about specific meeting |
| `/api/rag/process` | POST | Process meeting for RAG |

**Request/Response Examples:**

```typescript
// POST /api/rag/chat-all
{
  "message": "What were the action items from last week?"
}
// Response
{
  "response": "Based on your meetings...",
  "sources": [
    {
      "meetingId": "...",
      "meetingTitle": "...",
      "excerpt": "..."
    }
  ]
}

// POST /api/rag/process
{
  "meetingId": "clxxx..."
}
// Response
{
  "success": true,
  "chunksProcessed": 5,
  "vectorsCreated": 5
}
```

### Webhooks

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/webhooks/meetingbaas` | POST | Receive recording/transcript |
| `/api/webhooks/clerk` | POST | User creation/update events |

### Integrations

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/integrations/jira/oauth` | GET | Jira OAuth flow |
| `/api/integrations/asana/oauth` | GET | Asana OAuth flow |
| `/api/integrations/trello/oauth` | GET | Trello OAuth flow |
| `/api/integrations/action-items` | POST | Sync action items |
| `/api/calendar/sync` | POST | Manual calendar sync |

### Slack

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/slack/install` | GET | Workspace installation |
| `/api/slack/oauth` | GET | OAuth callback |
| `/api/slack/events` | POST | Event subscriptions |
| `/api/slack/post-meeting` | POST | Post summary to channel |

### Admin/Utilities

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/create-sample-meetings` | POST | Generate test data |
| `/api/admin/fix-action-items` | POST | Batch fix action items |
| `/api/admin/fix-audio-urls` | POST | Update S3 URLs |
| `/api/upload/bot-avatar` | POST | Upload bot profile image |

---

## 7. Data Flow & Workflows

### Complete Meeting Lifecycle

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. SCHEDULING PHASE                                             │
│    - User creates meeting in Google Calendar                    │
│    - Lambda polls calendar (every 5 minutes)                    │
│    - Meeting record created in DB                               │
│    - Bot scheduled for meeting                                  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. RECORDING PHASE                                              │
│    - MeetingBaaS bot joins 5 min before                         │
│    - Audio recorded throughout meeting                          │
│    - Real-time transcription (optional)                         │
│    - Recording uploaded to S3                                   │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. WEBHOOK PROCESSING                                           │
│    - MeetingBaaS sends POST to /api/webhooks/meetingbaas       │
│    - Payload includes: transcript, speakers, recording URL      │
│    - Meeting updated: transcriptReady = true                    │
│    - Trigger AI processing                                      │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. AI PROCESSING                                                │
│    - processMeetingTranscript() called                          │
│    - Ollama generates summary                                   │
│    - Ollama extracts action items                               │
│    - Results stored in Meeting record                           │
│    - Meeting marked as processed = true                         │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. NOTIFICATIONS                                                │
│    - Email sent to attendees with summary                       │
│    - Slack message posted (if connected)                        │
│    - Action items routed to Jira/Asana/Trello                  │
│    - Meeting marked as emailSent = true                         │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. RAG PROCESSING                                               │
│    - Transcript chunked into segments                           │
│    - Each chunk embedded via Ollama (768-dim)                   │
│    - Vectors stored in Pinecone with metadata                   │
│    - Meeting marked as ragProcessed = true                      │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ 7. USER INTERACTION                                             │
│    - User views meeting details                                 │
│    - User plays audio recording                                 │
│    - User chats with meeting via RAG                            │
│    - User searches across all meetings                          │
└─────────────────────────────────────────────────────────────────┘
```

### RAG Query Flow (Detailed)

```
User Query: "What did Sarah say about the analytics dashboard?"
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│ 1. EMBEDDING GENERATION                                         │
│    - Query sent to Ollama (nomic-embed-text model)             │
│    - Returns 768-dimensional vector                             │
│    - Vector: [0.12, -0.45, 0.78, ..., 0.03]                    │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. VECTOR SEARCH                                                │
│    - Pinecone query with filters:                               │
│      * userId: "user_xxx"                                       │
│      * speakerName: "Sarah" (optional)                          │
│    - Return top 5 results by cosine similarity                  │
│    - Results include: content, meeting, speaker, score          │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. CONTEXT ASSEMBLY                                             │
│    Example context:                                             │
│    "Meeting: Q4 Planning - Oct 15, 2024                        │
│     Speaker: Sarah Johnson                                      │
│     Content: I think we should prioritize the analytics        │
│     dashboard with real-time data visualization...             │
│                                                                 │
│     Meeting: Feature Review - Oct 20, 2024                     │
│     Speaker: Sarah Johnson                                      │
│     Content: The analytics dashboard mockups look great..."    │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. LLM PROMPT CONSTRUCTION                                      │
│    System: "You are a meeting assistant..."                    │
│    Context: [Assembled meeting excerpts]                        │
│    User Question: "What did Sarah say about analytics?"        │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. ANSWER GENERATION                                            │
│    - Sent to Ollama (Mistral/Llama2)                           │
│    - LLM generates contextual answer                            │
│    - Includes citations to source meetings                      │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. RESPONSE FORMATTING                                          │
│    {                                                            │
│      "response": "Sarah discussed the analytics dashboard...", │
│      "sources": [                                               │
│        {                                                        │
│          "meetingId": "...",                                    │
│          "meetingTitle": "Q4 Planning",                         │
│          "excerpt": "I think we should prioritize..."          │
│        }                                                        │
│      ]                                                          │
│    }                                                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8. External Integrations

### Google Calendar Integration

**Purpose:** Sync meetings and schedule bot attendance

**OAuth Scopes:**
- `https://www.googleapis.com/auth/calendar.readonly` - Read calendar events
- `https://www.googleapis.com/auth/calendar.events` - Create/modify events

**Implementation:**
```typescript
// lib/integrations/google-calendar.ts
export class GoogleCalendarService {
  async listUpcomingEvents(userId: string) {
    // Refresh token if needed
    // Query calendar API
    // Return events
  }
  
  async refreshAccessToken(userId: string) {
    // Exchange refresh token
    // Update User record
  }
}
```

**Lambda Polling:**
- Runs every 5 minutes
- Queries upcoming events for next 2 hours
- Schedules bot for new meetings
- Updates DB with meeting details

### Slack Integration

**Installation Types:**
1. **User Installation**: Personal workspace connection
2. **Bot Installation**: Workspace-wide bot deployment

**Features:**
- Post meeting summaries to channels
- DM bot for meeting questions
- @mention bot in channels
- Automatic action item notifications

**Event Handling:**
```typescript
// app/api/slack/events/route.ts
export async function POST(request: Request) {
  // Verify Slack signature
  // Parse event type
  // Route to handler (message, app_mention, etc.)
  // Process with RAG if question
  // Return response
}
```

**Signature Verification:**
```typescript
// Prevents unauthorized webhook calls
const signature = req.headers['x-slack-signature'];
const timestamp = req.headers['x-slack-request-timestamp'];
const hmac = crypto.createHmac('sha256', SLACK_SIGNING_SECRET);
hmac.update(`v0:${timestamp}:${body}`);
const computed = `v0=${hmac.digest('hex')}`;
return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(signature));
```

### Jira Integration

**OAuth Flow:**
1. User clicks "Connect Jira"
2. Redirect to Jira OAuth page
3. Exchange code for tokens
4. Store in UserIntegration table

**Action Item Sync:**
```typescript
// lib/integrations/jira.ts
export async function createJiraIssue({
  accessToken,
  domain,
  projectId,
  summary,
  description,
  assigneeId,
  dueDate
}) {
  const response = await fetch(
    `https://${domain}/rest/api/3/issue`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({
        fields: {
          project: { id: projectId },
          summary,
          description: { type: 'doc', content: [...] },
          assignee: { id: assigneeId },
          duedate: dueDate
        }
      })
    }
  );
  return response.json();
}
```

### Asana Integration

**Similar flow to Jira:**
- OAuth 2.0 with workspace selection
- Create tasks in projects
- Custom fields support
- Assignee and due date

### Trello Integration

**API Key + Token:**
- Trello uses API key instead of OAuth
- User provides key + token
- Create cards on boards
- Add labels and due dates

---

## 9. Development Setup

### Prerequisites Checklist

- [ ] Node.js >= 18 installed
- [ ] PostgreSQL database (or Neon account)
- [ ] Ollama installed locally
- [ ] Git installed
- [ ] Code editor (VS Code recommended)

### Step-by-Step Setup

#### 1. Clone Repository
```bash
git clone https://github.com/Tejapoosa/SyncUpFork.git
cd SyncUpFork
```

#### 2. Install Dependencies
```bash
npm install
```

#### 3. Set Up Ollama
```bash
# Install Ollama from https://ollama.ai

# Pull required models
ollama pull mistral         # 4.4 GB
ollama pull llama2          # 3.8 GB
ollama pull nomic-embed-text # 274 MB

# Start Ollama service
ollama serve
```

#### 4. Configure Environment Variables

Create `.env` file:
```env
# Database
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require

# Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx
CLERK_WEBHOOK_SECRET=whsec_xxx

# Google Calendar
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxx
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback

# Vector Search
PINECONE_API_KEY=pcsk_xxx
PINECONE_INDEX_NAME=meeting-bot-768

# Email
RESEND_API_KEY=re_xxx

# Cloud Storage
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA xxx
AWS_SECRET_ACCESS_KEY=xxx
S3_BUCKET_NAME=meeting-recordings

# Meeting Recording
MEETING_BAAS_API_KEY=xxx
WEBHOOK_URL=https://your-domain.ngrok-free.app/api/webhooks/meetingbaas
```

#### 5. Set Up Database
```bash
# Push schema to database
npx prisma db push

# Generate Prisma client
npx prisma generate

# Optional: Open database browser
npx prisma studio
```

#### 6. Create Pinecone Index
1. Go to https://www.pinecone.io/
2. Create account
3. Create index:
   - Name: `meeting-bot-768`
   - Dimensions: `768`
   - Metric: `cosine`
   - Pod type: `p1.x1` (starter)

#### 7. Set Up Clerk
1. Go to https://clerk.com/
2. Create application
3. Enable Google OAuth
4. Copy keys to `.env`
5. Configure webhooks for user events

#### 8. Start Development Server
```bash
npm run dev
```

Visit http://localhost:3000

### Testing with Sample Data

#### Create Sample Meeting
```bash
npx tsx scripts/seed-sample-meeting.ts
```

#### Process for RAG
```bash
npx tsx scripts/process-sample-for-rag.ts
```

#### Test Pinecone Connection
```bash
npx tsx scripts/test-pinecone-connection.ts
```

### Development Commands

```bash
# Start dev server with Turbopack
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint

# Database operations
npx prisma studio        # Open DB browser
npx prisma db push       # Update schema
npx prisma generate      # Regenerate client
npx prisma migrate dev   # Create migration

# Ollama operations
ollama list              # List models
ollama serve             # Start service
ollama pull <model>      # Download model
```

---

## 10. Deployment & Production

### Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         VERCEL                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                   Next.js Application                    │  │
│  │  - Frontend pages                                        │  │
│  │  - API routes                                            │  │
│  │  - Serverless functions                                  │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│  Neon DB     │   │ Clerk Auth   │   │  Pinecone    │
│ PostgreSQL   │   │   (SaaS)     │   │  Vectors     │
└──────────────┘   └──────────────┘   └──────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────────┐
│                           AWS                                   │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐       │
│  │      S3      │   │   Lambda     │   │   Lambda     │       │
│  │   (Audio)    │   │  (Calendar)  │   │   (Slack)    │       │
│  └──────────────┘   └──────────────┘   └──────────────┘       │
└─────────────────────────────────────────────────────────────────┘
        │
        ▼
┌──────────────┐
│ MeetingBaaS  │
│ (Recording)  │
└──────────────┘
```

### Vercel Deployment

#### 1. Connect Repository
```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel
```

#### 2. Configure Environment Variables

In Vercel dashboard, add all `.env` variables:
- Database URLs
- API keys
- OAuth credentials
- Webhook secrets

**Production-specific variables:**
```env
NEXT_PUBLIC_APP_URL=https://your-domain.com
GOOGLE_REDIRECT_URI=https://your-domain.com/api/auth/google/callback
WEBHOOK_URL=https://your-domain.com/api/webhooks/meetingbaas
```

#### 3. Build Settings
- **Framework**: Next.js
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`

### AWS Lambda Deployment

#### Calendar Sync Lambda

**Purpose:** Poll Google Calendar and schedule bots

**Deployment:**
```bash
cd lambda-function
zip -r function.zip .
aws lambda update-function-code \
  --function-name calendar-sync \
  --zip-file fileb://function.zip
```

**Environment Variables:**
- `DATABASE_URL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `MEETING_BAAS_API_KEY`

**Trigger:** CloudWatch Events (cron: every 5 minutes)

#### Slack Chat Lambda

**Purpose:** Handle Slack events asynchronously

**Deployment:**
```bash
cd lambda-chat
zip -r function.zip .
aws lambda update-function-code \
  --function-name slack-chat \
  --zip-file fileb://function.zip
```

### Database Migration

**Production database updates:**
```bash
# 1. Review schema changes
npx prisma migrate diff \
  --from-schema-datamodel prisma/schema.prisma \
  --to-schema-datasource $DATABASE_URL

# 2. Create migration
npx prisma migrate dev --name add_new_field

# 3. Apply to production
npx prisma migrate deploy
```

### Monitoring & Logging

#### Vercel Analytics
- Automatic performance monitoring
- Error tracking
- Request analytics

#### External Monitoring
- **Sentry**: Error tracking
- **LogRocket**: Session replay
- **Datadog**: Infrastructure monitoring

### Scaling Considerations

#### Database
- Neon auto-scaling up to 1000 connections
- Connection pooling via Prisma
- Read replicas for heavy queries

#### Pinecone
- Scales to millions of vectors
- Consider pod upgrades for performance
- Monitor query latency

#### Ollama
- Self-hosted requires GPU server
- Consider cloud alternatives (Together AI, Replicate)
- Cache embeddings to reduce load

---

## 11. Security & Privacy

### Authentication & Authorization

#### User Authentication
- **Clerk** handles all auth flows
- Magic link, Google OAuth, Email/Password
- Session management via JWT
- Secure cookie storage

#### API Protection
```typescript
// All API routes protected
import { auth } from '@clerk/nextjs';

export async function GET(request: Request) {
  const { userId } = auth();
  if (!userId) {
    return new Response('Unauthorized', { status: 401 });
  }
  // ...
}
```

#### Multi-Tenancy Isolation
```typescript
// All queries filtered by userId
const meetings = await prisma.meeting.findMany({
  where: { userId: user.id }
});
```

### Data Privacy

#### Local AI Processing
- **No data sent to OpenAI/Anthropic**
- Ollama runs on local machine
- Transcripts processed privately
- Cost: $0 for AI inference

#### Data Encryption
- **In Transit**: HTTPS/TLS for all requests
- **At Rest**: Neon encrypts database
- **S3**: Server-side encryption (AES-256)

#### OAuth Token Security
- Tokens stored encrypted in PostgreSQL
- Automatic refresh before expiry
- Revocation on disconnect

### Webhook Security

#### Signature Verification

**Slack:**
```typescript
function verifySlackSignature(req: Request): boolean {
  const signature = req.headers['x-slack-signature'];
  const timestamp = req.headers['x-slack-request-timestamp'];
  const body = await req.text();
  
  const hmac = crypto.createHmac('sha256', process.env.SLACK_SIGNING_SECRET!);
  hmac.update(`v0:${timestamp}:${body}`);
  const computed = `v0=${hmac.digest('hex')}`;
  
  return crypto.timingSafeEqual(
    Buffer.from(computed),
    Buffer.from(signature)
  );
}
```

**Clerk:**
```typescript
import { Webhook } from 'svix';

const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET!);
const evt = wh.verify(body, {
  'svix-id': req.headers['svix-id'],
  'svix-timestamp': req.headers['svix-timestamp'],
  'svix-signature': req.headers['svix-signature'],
});
```

### Compliance

#### GDPR
- User data deletion on request
- Data export functionality
- Privacy policy required

#### Data Retention
- Meetings retained indefinitely (user-controlled)
- Vectors in Pinecone linked to meetings
- Automatic cascade delete on meeting deletion

---

## 12. Testing Strategy

### Manual Testing

See `TESTING_GUIDE.md` for comprehensive checklist

**Key Areas:**
1. Authentication flow
2. Calendar connection
3. Meeting recording
4. AI processing
5. RAG chat functionality
6. Integrations (Slack, Jira, etc.)

### RAG Testing

See `RAG_TESTING_GUIDE.md` for detailed RAG tests

**Test Flow:**
1. Seed sample meeting
2. Process for RAG
3. Test chat queries
4. Verify Pinecone vectors
5. Check answer accuracy

### Automated Testing (Future)

```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e
```

### Performance Testing

#### Load Testing
```bash
# Using Apache Bench
ab -n 1000 -c 10 http://localhost:3000/

# Using k6
k6 run load-test.js
```

#### Database Performance
- Monitor query execution time in Prisma
- Use `prisma studio` to inspect indexes
- Add indexes for frequently queried fields

---

## 13. Troubleshooting

### Common Issues

#### Issue 1: Ollama Not Responding

**Symptoms:**
- Chat returns errors
- Embeddings fail to generate

**Solutions:**
```bash
# Check if Ollama is running
ollama list

# Restart Ollama
ollama serve

# Check models are downloaded
ollama list

# Pull missing models
ollama pull mistral
ollama pull nomic-embed-text
```

#### Issue 2: Pinecone Dimension Mismatch

**Error:** `Dimension mismatch: expected 768, got 1536`

**Cause:** Index created with wrong dimensions

**Solution:**
1. Delete old index in Pinecone dashboard
2. Create new index with dimensions: 768
3. Update `PINECONE_INDEX_NAME` in `.env`
4. Reprocess all meetings

#### Issue 3: Database Connection Errors

**Symptoms:**
- API routes return 500 errors
- Prisma client errors

**Solutions:**
```bash
# Regenerate Prisma client
npx prisma generate

# Reset database (CAUTION: deletes data)
npx prisma db push --force-reset

# Check DATABASE_URL is correct
echo $DATABASE_URL
```

#### Issue 4: Google Calendar Not Syncing

**Checklist:**
- [ ] OAuth tokens stored in database
- [ ] `calenderConnected` = true
- [ ] Lambda function running
- [ ] Redirect URI matches exactly
- [ ] Scopes include calendar access

**Debug:**
```bash
# Check user record
npx prisma studio
# Verify googleAccessToken and googleRefreshToken exist

# Test token manually
curl -H "Authorization: Bearer $TOKEN" \
  https://www.googleapis.com/calendar/v3/calendars/primary/events
```

#### Issue 5: Chat Not Returning Results

**Debug Flow:**
1. Check meeting is RAG processed:
   ```sql
   SELECT id, title, ragProcessed FROM "Meeting" WHERE ragProcessed = false;
   ```
2. Verify vectors in Pinecone:
   - Go to Pinecone dashboard
   - Check vector count in index
3. Test embedding generation:
   ```bash
   npx tsx scripts/test-rag-dependencies.ts
   ```
4. Reprocess meeting:
   ```bash
   curl -X POST http://localhost:3000/api/rag/process \
     -H "Content-Type: application/json" \
     -d '{"meetingId":"xxx"}'
   ```

### Error Logs

#### Where to Find Logs

**Development:**
- Terminal running `npm run dev`
- Browser console (F12 → Console)

**Production (Vercel):**
- Vercel dashboard → Logs
- Real-time function logs
- Error aggregation

**Lambda:**
- CloudWatch Logs
- Function-specific log groups

### Performance Issues

#### Slow RAG Queries

**Possible causes:**
1. Large Pinecone namespace
2. Slow Ollama inference
3. Network latency

**Solutions:**
- Reduce `topK` in RAG queries
- Upgrade Pinecone pod type
- Use GPU-accelerated Ollama
- Cache frequent queries

#### High Memory Usage

**Cause:** Large Prisma queries loading too much data

**Solution:**
```typescript
// Paginate results
const meetings = await prisma.meeting.findMany({
  take: 20,
  skip: page * 20,
  select: { id: true, title: true, startTime: true } // Only needed fields
});
```

---

## 📞 Support & Resources

### Documentation
- [README.md](README.md) - Quick start guide
- [TESTING_GUIDE.md](TESTING_GUIDE.md) - Complete testing procedures
- [RAG_TESTING_GUIDE.md](RAG_TESTING_GUIDE.md) - RAG-specific testing
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Common issues
- [STRIPE_REMOVAL_GUIDE.md](STRIPE_REMOVAL_GUIDE.md) - Stripe removal details

### External Resources
- [Ollama Documentation](https://ollama.ai/docs)
- [Pinecone Documentation](https://docs.pinecone.io)
- [Clerk Documentation](https://clerk.com/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Next.js Documentation](https://nextjs.org/docs)

### Community
- **GitHub Issues**: https://github.com/Tejapoosa/SyncUpFork/issues
- **Email**: tejapoosa123@gmail.com

---

## 🎉 Conclusion

Meeting Bot is a comprehensive meeting management platform that combines:
- ✅ Modern web architecture (Next.js, React, TypeScript)
- ✅ Privacy-first AI (local Ollama processing)
- ✅ Intelligent search (RAG with Pinecone)
- ✅ Rich integrations (Calendar, Slack, Jira, Asana, Trello)
- ✅ Production-ready deployment (Vercel, AWS, Neon)

The system is designed for scalability, security, and ease of use, providing a complete solution for teams to manage their meeting workflows efficiently.

---

**Last Updated:** 2024
**Version:** 0.1.0
**Maintainer:** Tejapoosa
