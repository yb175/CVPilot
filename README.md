# CVPilot — AI-Powered Resume-to-Job Matching Platform

[![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/postgres-%23316192.svg?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white)](https://www.prisma.io/)
[![License: Proprietary](https://img.shields.io/badge/License-Proprietary-red)](./LICENSE)

> A precision tool for ambitious job seekers. Use neural-matching to bypass the noise and land high-stakes opportunities.

## 📋 Table of Contents

- [Project Overview](#-project-overview)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Getting Started](#-getting-started)
- [Project Structure](#-project-structure)
- [Development Workflow](#-development-workflow)
- [Contributing](#-contributing)
- [Troubleshooting](#-troubleshooting)
- [License](#-license)

---

## 🎯 Project Overview

CVPilot is an **intelligent resume-to-job matching platform** that helps job seekers discover and apply to the most relevant opportunities. Using advanced AI and natural language processing, CVPilot:

- **Analyzes your resume** to extract skills, experience, and career profile
- **Matches you with live job listings** from the Active Jobs database
- **Scores jobs intelligently** (0-100%) based on skill alignment and requirements
- **Generates ATS optimization tips** tailored to specific job descriptions
- **Tracks preferences** (seniority level, location type) for personalized recommendations

### Use Case Flow

```
User Signs Up (Clerk Auth)
        ↓
Upload Resume (PDF/DOCX)
        ↓
AI Parses Resume (Google Gemini)
        ↓
Set Job Preferences (Location, Seniority)
        ↓
Browse Jobs (Active Jobs API)
        ↓
AI Matches Resume vs Job (LLM Scoring)
        ↓
View Ranked Results (Score + Confidence)
        ↓
Get ATS Optimization Tips
        ↓
Apply with Confidence
```

---

## ✨ Key Features

### For Job Seekers

| Feature | Description | Status |
|---------|-------------|--------|
| **Smart Resume Upload** | Upload PDF/DOCX files; AI extracts structure automatically | ✅ Production |
| **AI Resume Parsing** | Google Gemini extracts skills, experience, seniority level | ✅ Production |
| **Job Matching** | LLM-based scoring matches your profile vs job requirements | ✅ Production (V2) |
| **Match Confidence** | See not just scores but confidence levels (0-1) | ✅ Production |
| **Preference Management** | Set seniority & location preferences for personalized jobs | ✅ Production |
| **ATS Optimization** | Get resume tweaks to pass ATS scanners for specific jobs | ✅ Production |
| **Job Tracking** | View your matched jobs and scores in one dashboard | ✅ Production |

### For Developers

| Feature | Description |
|---------|-------------|
| **Type-Safe APIs** | Full TypeScript throughout frontend & backend |
| **Clean Architecture** | Layered design (controller → service → DB) |
| **Comprehensive Docs** | API docs, setup guides, architecture explanations |
| **Testing Framework** | Unit tests for services, integration tests for routes |
| **Error Handling** | Centralized error middleware with correlation IDs |
| **Structured Logging** | JSON-formatted logs with context (userId, duration, etc.) |
| **CI/CD Ready** | Pipeline-friendly build steps and database migrations |

---

## 🛠️ Tech Stack

### Frontend

```
React 19                    - Component library with hooks, server components
TypeScript 5.9              - Static type checking for frontend code
Vite 8                      - Ultra-fast build tool with HMR
Tailwind CSS 3.4            - Utility-first styling framework
React Router DOM 7          - Client-side routing and navigation
Clerk @clerk/react          - Authentication (sign-up, login, sessions)
pdfjs-dist 5.6              - In-browser PDF rendering
Mammoth 1.12                - Word document (.docx) conversion
```

### Backend

```
Node.js 18+                 - JavaScript runtime
Express 5.2                 - Web framework and HTTP routing
TypeScript 6                - Type-safe backend code
PostgreSQL 13+              - Relational database
Prisma 7.7                  - Type-safe ORM with migrations
@clerk/express 2.1          - Backend auth middleware for Clerk
@google/generative-ai 0.21  - Google Gemini API for AI features
Cloudinary 2.9              - CDN file storage for resumes
Zod 4.3                     - Runtime input validation
TSX 4.21                    - TypeScript execution for dev
```

### DevOps & Tools

```
pnpm 8+                     - Fast, disk-efficient package manager
Prisma CLI                  - Database schema & migration tools
tsx watch                   - Hot-reload for backend development
ESLint + Prettier           - Code quality & formatting
Docker                      - Container deployment (optional)
PM2                         - Production process manager (optional)
```

---

## 🏗️ Architecture

### High-Level Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Landing Page │  │ Profile Page │  │  Job Page    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│         ↓                ↓                     ↓                 │
│  ┌─────────────────────────────────────────────────┐           │
│  │   Clerk Authentication (OAuth/Email/SSO)       │           │
│  └─────────────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────────┘
                              ↕ (HTTP/JSON)
┌─────────────────────────────────────────────────────────────────┐
│                     BACKEND (Express.js)                        │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  API Routes: /resume, /jobs, /auth, /preferences         │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Controllers: HTTP adapters (validation, responses)      │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Services: Business logic (matching, parsing, storage)   │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Middleware: Auth (Clerk), validation (Zod), errors      │  │
│  └────────────────────────────────────────────────────────��─┘  │
└─────────────────────────────────────────────────────────────────┘
      ↓                      ↓                        ↓
   ┌─────────────┐  ┌──────────────────┐  ┌───────────────────┐
   │ PostgreSQL  │  │  Cloudinary CDN  │  │  Google Gemini    │
   │  (Prisma)   │  │  (File Storage)  │  │  (AI Scoring)     │
   └─────────────┘  └──────────────────┘  └───────────────────┘
      ↓
   ┌─────────────────────────────────────┐
   │  Active Jobs API (Job Listings)     │
   └─────────────────────────────────────┘
```

### Layered Backend Architecture

```
REQUEST FLOW:
─────────────────────────────────────────────────────────────

HTTP Request
    ↓
MIDDLEWARE LAYER
  ├─ Body parsing (JSON)
  ├─ CORS validation
  ├─ Clerk JWT verification
  ├─ Input validation (Zod)
  └─ Error handling
    ↓
ROUTE LAYER
  └─ Route matching & HTTP method handling
    ↓
CONTROLLER LAYER
  ├─ Extract request parameters
  ├─ Call service functions
  └─ Format HTTP response
    ↓
SERVICE LAYER (Business Logic)
  ├─ Orchestration (multi-step workflows)
  ├─ Domain rules & validation
  ├─ LLM calls (Gemini API)
  ├─ Job matching algorithms
  └─ Transaction management
    ↓
LIB LAYER (Singletons)
  ├─ Prisma client instance
  ├─ Logger factory
  ├─ Cloud storage client
  └─ Configuration loaders
    ↓
DATABASE & EXTERNAL SERVICES
  ├─ PostgreSQL (Prisma ORM)
  ├─ Cloudinary (file storage)
  ├─ Google Gemini (AI)
  └─ Active Jobs API (job listings)
    ↓
SERVICE LAYER (responses flow back)
    ↓
CONTROLLER LAYER (transforms)
    ↓
HTTP RESPONSE (JSON)
```

### Backend Folder Structure

```
backend/
├── server.ts                    # Express app entry point
├── package.json                 # Dependencies
├── tsconfig.json                # TypeScript config
│
├── config/                      # Configuration
│   └── environment validation
│
├── route/                       # Route definitions
│   ├── auth.route.ts
│   ├── resume.route.ts
│   ├── jobs.route.ts
│   └── preferences.route.ts
│
├── controller/                  # HTTP handlers
│   ├── authController.ts
│   ├── resumeController.ts
│   ├── jobsController.ts
│   └── preferencesController.ts
│
├── middleware/                  # Express middleware
│   ├── auth.middleware.ts       # Clerk validation
│   ├── validation.middleware.ts # Zod schemas
│   ├── errorHandler.middleware.ts
│   └── upload.middleware.ts     # Multer for files
│
├── service/                     # Business logic
│   ├── resume/
│   │   ├── resumeService.ts
│   │   ├── fileDownloader.ts
│   │   └── parser.ts
│   │
│   ├── jobs/
│   │   ├── jobsService.ts
│   │   ├── llmJobMatcherV2.ts   # AI scoring
│   │   ├── providers/
│   │   │   └── activeJobs.provider.ts
│   │   ├── matchCache.ts        # In-memory cache
│   │   └── jobMatch.service.ts
│   │
│   ├── preferences/
│   │   └── preferencesService.ts
│   │
│   ├── user/
│   │   └── userService.ts
│   │
│   └── geminiClient.ts          # Google AI setup
│
├── lib/                         # Shared utilities
│   ├── prisma.ts                # Singleton Prisma
│   ├── logger.ts                # Logging utility
│   ├── cloudinary.ts            # File storage
│   └── validators.ts            # Zod schemas
│
├── prisma/                      # Database
│   ├── schema.prisma            # DB schema
│   ├── migrations/              # Version-controlled migrations
│   └── seed.ts                  # Seed data
│
├── scripts/                     # Developer helpers
│   └── fix-prisma-imports.mjs
│
├── tests/                       # Test suite
│   ├── jobs.test.ts
│   ├── greenhouse.provider.test.ts
│   └── active-jobs.real-api.test.ts
│
├── docs/                        # Documentation
│   ├── IMPLEMENTATION_CHECKLIST.md
│   ├── V2_MIGRATION_GUIDE.md
│   ├── JOB_MATCHING_ROOT_CAUSE_ANALYSIS.md
│   └── EXECUTIVE_SUMMARY.md
│
└── README.md                    # Backend setup & architecture
   DOCUMENTATION.md             # Complete API reference
```

### Key Design Patterns

#### 1. **Separation of Concerns**
- **Controllers** handle HTTP only (request validation, response formatting)
- **Services** contain business logic (no HTTP knowledge)
- **Middleware** handles cross-cutting concerns (auth, logging, errors)
- **Lib** provides singletons (Prisma, logger, config)

#### 2. **Error Handling Strategy**
```typescript
// ❌ BAD: Errors leak stack traces to client
res.status(500).json({ error: err.stack });

// ✅ GOOD: User-friendly messages with logging
logger.error("OPERATION_FAILED", {
  userId,
  error: err.message,
  stack: err.stack,
  requestId: req.id,
});
res.status(500).json({
  error: "Operation failed",
  requestId: req.id,  // For support debugging
});
```

#### 3. **Input Validation with Zod**
```typescript
import { z } from "zod";

const createPreferencesSchema = z.object({
  seniority: z.enum(["INTERN", "FULLTIME"]),
  locationPreferences: z
    .array(z.enum(["ONSITE", "HYBRID", "REMOTE"]))
    .min(1),
});

// TypeScript knows the shape after validation
const validated = createPreferencesSchema.parse(req.body);
// ✅ validated is strictly typed
```

#### 4. **Caching Strategy**
```typescript
// In-memory LRU cache for job matches
const cache = new MatchCache(maxEntries: 10000);

export async function matchJobs(userId, resume) {
  const cacheKey = `${userId}:${resumeHash}`;
  
  // Check cache first
  const cached = cache.get(userId, jobId);
  if (cached) return cached;  // Cache hit!
  
  // Cache miss: run expensive LLM pipeline
  const result = await runLLMMatching(resume, jobs);
  
  // Store in cache
  cache.set(userId, jobId, result);
  
  return result;
}
```

---

## 🚀 Getting Started

### Prerequisites

Before you begin, ensure you have:

- **Node.js** v18 or higher ([Download](https://nodejs.org/))
- **pnpm** v8 or higher (`npm install -g pnpm`)
- **PostgreSQL** 13+ ([Download](https://www.postgresql.org/download/))
- **Git** for version control

### 1. Clone the Repository

```bash
git clone https://github.com/yb175/CVPilot.git
cd CVPilot
```

### 2. Install Dependencies

```bash
# Install both backend & frontend dependencies (monorepo)
pnpm install
```

### 3. Backend Setup

```bash
cd backend

# Copy environment template
cp .env.sample .env

# ⚠️ IMPORTANT: Edit .env with your credentials
# Required variables:
# - DATABASE_URL=postgresql://user:password@localhost:5432/cvpilot
# - CLERK_SECRET_KEY=sk_test_...
# - CLERK_PUBLISHABLE_KEY=pk_test_...
# - GOOGLE_GEMINI_API_KEY=AIzaSy...
# - CLOUDINARY_CLOUD_NAME=...
# - CLOUDINARY_API_KEY=...
# - CLOUDINARY_API_SECRET=...
# - RAPIDAPI_KEY=...

# Generate Prisma client
pnpm prisma generate

# Apply database migrations
pnpm prisma migrate dev --name init

# Verify database setup
pnpm prisma studio

cd ..
```

### 4. Frontend Setup

```bash
cd frontend

# Copy environment template
cp .env.sample .env

# ⚠️ IMPORTANT: Edit .env with your credentials
# Required variables:
# - VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
# - VITE_API_URL=http://localhost:3000

cd ..
```

### 5. Start Development Servers

Open two terminal windows:

**Terminal 1: Backend Server**
```bash
cd backend
pnpm run dev

# Output:
# [Server] Gemini client initialized
# Server started on port 3000
```

**Terminal 2: Frontend Dev Server**
```bash
cd frontend
pnpm run dev

# Output:
# VITE v8.0.1 ready in 256 ms
# ➜ Local: http://localhost:5173/
# ➜ press h to show help
```

### 6. Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **API Docs**: http://localhost:3000/api/docs *(if Swagger is enabled)*
- **Prisma Studio**: `cd backend && pnpm prisma studio`

### 7. Verify Everything Works

```bash
# Test API health check
curl http://localhost:3000/health

# Expected output: OK
```

---

## 📁 Project Structure

### Root Level

```
CVPilot/
├── backend/                     # Node.js API server
│   ├── README.md               # Backend-specific docs
│   ├── DOCUMENTATION.md        # Complete API reference
│   ├── server.ts               # Express app entry
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── controller/
│   │   ├── service/
│   │   ├── route/
│   │   ├── middleware/
│   │   ├── lib/
│   │   └── tests/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   └── docs/
│
├── frontend/                    # React SPA
│   ├── README.md               # Frontend-specific docs
│   ├── src/
│   │   ├── main.tsx            # App entry point
│   │   ├── App.tsx             # Root component
│   │   ├── pages/              # Route pages
│   │   ├── components/         # Reusable components
│   │   ├── services/           # API utilities
│   │   ├── lib/                # Helpers
│   │   ├── styles/             # Global CSS
│   │   └── types/              # TypeScript types
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── package.json                # Root monorepo config
├── pnpm-workspace.yaml         # pnpm monorepo setup
├── README.md                   # This file
├── LICENSE                     # Proprietary license
└── .gitignore
```

### Key Directories Explained

#### `backend/src/`
- **controllers/** — HTTP request handlers (thin adapters)
- **services/** — Business logic & orchestration
- **routes/** — API endpoint definitions
- **middleware/** — Auth, validation, error handling
- **lib/** — Shared utilities (Prisma, logger, config)
- **tests/** — Unit and integration tests

#### `frontend/src/`
- **pages/** — Full-page components (routed)
- **components/** — Reusable UI components
- **services/** — API calls & data fetching
- **lib/** — Helper functions, utilities
- **types/** — TypeScript interfaces

---

## 🔧 Development Workflow

### Making Changes

#### Backend Changes

```bash
cd backend

# Make code changes in src/

# TypeScript will compile automatically (tsx watch)
# Errors show in terminal immediately

# Tests (manual check)
pnpm run test

# Build for production
pnpm build
# Output: dist/server.js
```

#### Frontend Changes

```bash
cd frontend

# Make code changes in src/

# Vite auto-reloads (HMR)
# Changes appear instantly in browser
# Type errors show in terminal

# Build for production
pnpm build
# Output: dist/ (static files)
```

### Database Changes

```bash
cd backend

# 1. Edit schema.prisma
# 2. Create migration
pnpm prisma migrate dev --name <migration_name>

# Example:
# pnpm prisma migrate dev --name add_user_verified_field

# This creates:
# - prisma/migrations/<timestamp>_<name>/migration.sql
# - Updates generated Prisma client

# 3. Commit to Git
git add prisma/migrations/
git commit -m "feat: add user verified field"
```

### Running Tests

```bash
cd backend

# Run all tests
pnpm run test:all

# Run specific test suite
pnpm run test              # Job service tests
pnpm run test:provider     # ATS provider tests
pnpm run test:active-jobs  # Real API tests
```

### Code Quality Checks

```bash
# Type checking (both packages)
pnpm run type-check

# Linting (when configured)
pnpm run lint

# Formatting (when configured)
pnpm run format
```

---

## 🤝 Contributing

We welcome contributions from the community! Here's how to get involved:

### Contribution Types

1. **Bug Fixes** — Fix existing issues and improve stability
2. **Features** — Add new functionality aligned with roadmap
3. **Documentation** — Improve READMEs, docs, and comments
4. **Performance** — Optimize latency, database queries, caching
5. **Tests** — Increase code coverage and reliability

### Before You Start

- ✅ Check [open issues](https://github.com/yb175/CVPilot/issues) to avoid duplicates
- ✅ Review the [architecture section](#-architecture) to understand design patterns
- ✅ Read [CONTRIBUTION_GUIDELINES.md](./CONTRIBUTION_GUIDELINES.md) for detailed guidelines
- ✅ Set up local development environment (follow [Getting Started](#-getting-started))

### Step-by-Step Guide

#### 1. Fork & Clone

```bash
# Fork the repo on GitHub
# Then clone your fork
git clone https://github.com/YOUR_USERNAME/CVPilot.git
cd CVPilot

# Add upstream remote for syncing
git remote add upstream https://github.com/yb175/CVPilot.git
```

#### 2. Create a Feature Branch

```bash
# Sync with latest upstream
git fetch upstream
git checkout upstream/main

# Create feature branch
git checkout -b feature/my-feature-name

# Example branch names:
# - feature/resume-caching
# - fix/job-matching-score-bug
# - docs/api-reference
# - perf/optimize-db-queries
```

#### 3. Make Your Changes

Follow the architecture patterns:

```typescript
// Example: Adding a new service feature

// 1. Define Zod schema for inputs
// backend/lib/validators.ts
export const matchJobsSchema = z.object({
  resumeHash: z.string(),
  filters: z.object({
    minScore: z.number().min(0).max(100),
  }).optional(),
});

// 2. Create service function
// backend/service/jobs/matchingService.ts
export async function matchJobsImproved(
  userId: number,
  resume: ParsedResume,
  filters?: MatchFilters
) {
  // Validate inputs
  const validated = matchJobsSchema.parse({ resumeHash, filters });
  
  // Core logic
  const scores = await runLLMMatching(resume);
  
  // Filter
  const filtered = scores.filter(s => s.score >= (filters?.minScore ?? 0));
  
  // Persist
  await persistMatchResults(userId, filtered);
  
  return filtered;
}

// 3. Create controller handler
// backend/controller/jobsController.ts
export async function matchJobsHandler(req: Request, res: Response) {
  const clerkUserId = req.auth?.userId;
  const filters = req.body.filters;
  
  const resume = await getResume(clerkUserId);
  const results = await matchJobsImproved(userId, resume, filters);
  
  res.json({
    success: true,
    count: results.length,
    results,
  });
}

// 4. Wire up route
// backend/route/jobsRoute.ts
router.post("/match", matchJobsHandler);

// 5. Add tests
// backend/tests/matching.test.ts
async function testMatchingImproved() {
  const results = await matchJobsImproved(userId, resume, { minScore: 80 });
  console.assert(results.every(r => r.score >= 80), "All scores >= 80");
}
```

#### 4. Write/Update Tests

```typescript
// backend/tests/my-feature.test.ts

import prisma from "../../lib/prisma.js";
import { myNewFunction } from "../../service/myNewService.js";

async function testMyFeature() {
  console.log("🧪 Testing My Feature...\n");

  try {
    // Setup
    const testUser = await prisma.user.create({
      data: {
        clerkId: `test_${Date.now()}`,
        email: `test_${Date.now()}@example.com`,
      },
    });

    // Test
    const result = await myNewFunction(testUser.id);
    console.assert(result !== null, "Result should not be null");
    console.assert(result.success === true, "Result should indicate success");

    // Cleanup
    await prisma.user.delete({ where: { id: testUser.id } });

    console.log("✅ Test passed!");
  } catch (error) {
    console.error("❌ Test failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testMyFeature();
```

Run tests before committing:
```bash
pnpm run test:all
```

#### 5. Commit with Clear Messages

```bash
# Use conventional commit format
git add .
git commit -m "feat(jobs): add minimum score filter to matching

- Add matchJobsImproved service function
- Support optional minScore filter
- Add validation with Zod schema
- Include tests for new functionality
- Resolves #123"

# Examples:
# feat(resume): add resume caching to reduce latency
# fix(matching): filter out jobs with missing IDs
# docs(api): update job matching endpoint documentation
# perf(db): add index to job_matches table
# test(service): add unit tests for resume parser
```

#### 6. Push & Create Pull Request

```bash
# Push your feature branch
git push origin feature/my-feature-name

# Create PR on GitHub
# Title: Clear, descriptive
# Description: Explain what changed and why
# Link related issues: "Closes #123"
```

**PR Description Template:**
```markdown
## Description
Brief explanation of what this PR does.

## Changes
- Change 1
- Change 2
- Change 3

## Testing
How to test these changes:
1. Step 1
2. Step 2

## Related Issues
Closes #123
Fixes #456

## Checklist
- [ ] Code follows project architecture patterns
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No breaking changes
- [ ] TypeScript compiles without errors
```

#### 7. Code Review

- Respond to feedback promptly
- Make requested changes in follow-up commits
- Once approved, maintainers will merge

### Coding Standards

#### TypeScript

```typescript
// ✅ DO: Use strict typing
async function getUserWithResume(userId: number): Promise<UserWithResume> {
  return await prisma.user.findUnique({
    where: { id: userId },
    include: { resume: true },
  });
}

// ❌ DON'T: Avoid 'any'
async function getUser(userId: any) {
  return await prisma.user.findUnique({
    where: { id: userId },
  });
}

// ✅ DO: Use enums for fixed values
enum Seniority {
  INTERN = "INTERN",
  FULLTIME = "FULLTIME",
}

// ❌ DON'T: Use string literals everywhere
function setSeniority(seniority: "INTERN" | "FULLTIME") {
  // ...
}
```

#### Error Handling

```typescript
// ✅ DO: Handle and log errors appropriately
try {
  const result = await runExpensiveOperation();
  return result;
} catch (error) {
  logger.error("OPERATION_FAILED", {
    userId,
    error: error instanceof Error ? error.message : String(error),
  });
  throw new HttpError(500, "Operation failed");
}

// ❌ DON'T: Let errors propagate silently
try {
  await runExpensiveOperation();
} catch (error) {
  // Silently swallow error
}
```

#### Naming Conventions

```typescript
// ✅ DO: Use clear, descriptive names
const jobMatchScore = 87;
const getUserJobMatches = (userId: number) => {};
const MAXIMUM_CACHE_ENTRIES = 10000;

// ❌ DON'T: Use single-letter or cryptic names
const jms = 87;
const gu = (u: number) => {};
const MAX_CACHE = 10000;
```

### Project-Specific Guidelines

#### Backend Changes

- Place business logic in **service** layer
- Keep **controllers** thin (validation + response formatting)
- Use **Prisma** for all database access (no raw SQL)
- Add **tests** for service functions
- Update **DOCUMENTATION.md** if API changes

#### Frontend Changes

- Use **React hooks** (no class components)
- Keep components **small and focused**
- Use **TypeScript** for all prop types
- Use **Tailwind** for styling (no custom CSS)
- Test with **Clerk auth** before committing

#### Database Changes

- Always create **migrations** (never modify production DB directly)
- Migrations must be **idempotent** (safe to run multiple times)
- Test migrations locally before pushing
- Commit migration files to version control

---

## 🐛 Troubleshooting

### Common Setup Issues

#### Issue: `DATABASE_URL is not set`

**Solution:**
```bash
cd backend
cp .env.sample .env
# Edit .env and add your DATABASE_URL
```

#### Issue: `Port 3000 already in use`

**Solution:**
```bash
# Change port in backend/.env
PORT=3001

# Or kill existing process on port 3000
lsof -i :3000
kill -9 <PID>
```

#### Issue: `Prisma client not generated`

**Solution:**
```bash
cd backend
pnpm prisma generate
```

#### Issue: Migrations failed

**Solution:**
```bash
cd backend

# Reset database (dev only!)
pnpm prisma migrate reset

# Then reapply migrations
pnpm prisma migrate dev
```

### Development Issues

#### Issue: Frontend can't reach backend API

**Solution:**
```bash
# Check backend is running
curl http://localhost:3000/health

# If not, start backend:
cd backend && pnpm run dev

# Verify FRONTEND_URL in backend/.env
FRONTEND_URL=http://localhost:5173
```

#### Issue: Changes not reflecting after save

**Solution:**
```bash
# Backend: Restart tsx watch
# Terminal 1: Ctrl+C
# Terminal 1: pnpm run dev

# Frontend: Clear browser cache
# Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
```

### Testing Issues

#### Issue: Tests fail with "Database error"

**Solution:**
```bash
cd backend

# Ensure test database exists
createdb cvpilot_test

# Or use docker
docker run -d \
  --name postgres-test \
  -e POSTGRES_PASSWORD=postgres \
  -p 5433:5432 \
  postgres:15

# Set DATABASE_URL to test DB
export DATABASE_URL="postgresql://postgres:postgres@localhost:5433/cvpilot_test"

# Run tests
pnpm run test
```

### Performance Issues

#### Issue: Job matching takes >5 seconds

**Causes & Solutions:**
1. **No caching** → Implement Redis cache or in-memory LRU
2. **Cold Gemini API** → First call is slower; subsequent calls cached
3. **Large job list** → Filter jobs before LLM scoring (use Active Jobs filters)
4. **Slow DB** → Check database indexes on job_matches table

```bash
# Check database query performance
cd backend
pnpm prisma studio

# Or view logs
DEBUG=prisma:* pnpm run dev
```

---

## 📚 Additional Resources

### Documentation

- **[Backend README](./backend/README.md)** — Setup, architecture, running instructions
- **[API Documentation](./backend/DOCUMENTATION.md)** — Complete REST API reference (1200+ lines)
- **[Architecture Overview](#-architecture)** — Layered design patterns explained
- **[V2 Migration Guide](./backend/docs/V2_MIGRATION_GUIDE.md)** — Job matching V2 rollout strategy

### External Resources

- **[React Documentation](https://react.dev/)** — Official React docs and patterns
- **[Prisma Docs](https://www.prisma.io/docs/)** — ORM setup, migrations, best practices
- **[TypeScript Handbook](https://www.typescriptlang.org/docs/)** — Type system reference
- **[Clerk Documentation](https://clerk.com/docs)** — Auth integration guide
- **[Tailwind CSS](https://tailwindcss.com/docs)** — Utility-first CSS framework

### Project Links

- **[GitHub Issues](https://github.com/yb175/CVPilot/issues)** — Bug reports, feature requests
- **[GitHub Discussions](https://github.com/yb175/CVPilot/discussions)** — Ask questions, share ideas
- **[GitHub Projects](https://github.com/yb175/CVPilot/projects)** — Development roadmap

---

## 📋 Development Checklist

Before submitting a PR, ensure:

### Code Quality
- [ ] TypeScript compiles without errors (`pnpm run build`)
- [ ] No type assertions with `any`
- [ ] No unused imports or variables
- [ ] Code follows architecture patterns
- [ ] Error handling is comprehensive
- [ ] Logging includes context (userId, duration, etc.)

### Testing
- [ ] Unit tests added for service functions
- [ ] Integration tests added for API endpoints
- [ ] All tests pass (`pnpm run test:all`)
- [ ] Test coverage for happy & error paths

### Documentation
- [ ] Code comments explain complex logic
- [ ] Function JSDoc comments added
- [ ] README updated (if needed)
- [ ] API docs updated (if endpoints changed)
- [ ] Commit messages follow conventional format

### Database
- [ ] Migrations created (if schema changed)
- [ ] Migrations tested locally
- [ ] Migration files committed to Git
- [ ] Rollback plan documented (if applicable)

### Security
- [ ] No secrets in code or logs
- [ ] Input validation with Zod
- [ ] SQL injection impossible (using Prisma)
- [ ] Auth checks in place
- [ ] CORS properly configured

### Performance
- [ ] No N+1 queries (check Prisma includes)
- [ ] API responses under 2 seconds
- [ ] Database queries optimized
- [ ] Unnecessary API calls removed
- [ ] Caching strategy documented

---

## 📄 License

This project is **proprietary and confidential**. All rights reserved.

Unauthorized copying, modification, distribution, or use of this project is strictly prohibited.

For licensing inquiries, contact: [backend@cvpilot.dev](mailto:backend@cvpilot.dev)

---

## 🙏 Acknowledgments

CVPilot was built with ❤️ using:

- **Google Gemini API** — Advanced AI for resume parsing and job matching
- **Clerk** — Secure authentication infrastructure
- **Cloudinary** — Reliable file storage and CDN
- **Prisma** — Type-safe database access
- **React & Vite** — Modern, fast frontend development
- **Express & Node.js** — Lightweight, scalable backend

---

## 📞 Support

Have questions or need help?

- **Issues**: [GitHub Issues](https://github.com/yb175/CVPilot/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yb175/CVPilot/discussions)
- **Email**: [backend@cvpilot.dev](mailto:bhatiayug175@gmail.com)

---

## 🌟 Star Us!

If CVPilot helped you, please consider giving us a ⭐ on [GitHub](https://github.com/yb175/CVPilot)!

---

<div align="center">

**Made with ❤️ by the CVPilot Team**

Last Updated: April 2026 | Version 1.1.0

