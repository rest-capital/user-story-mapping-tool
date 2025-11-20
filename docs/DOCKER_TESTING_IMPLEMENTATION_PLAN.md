# Docker Testing Environment - Implementation Plan

**Project**: User Story Mapping Tool
**Created**: 2025-11-20
**Status**: Implementation Plan
**Reference**: Inspired by [DOCKER_TESTING_SETUP.md](./DOCKER_TESTING_SETUP.md) from NIL Marketplace project

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current State Analysis](#current-state-analysis)
3. [Goals & Benefits](#goals--benefits)
4. [Architecture Overview](#architecture-overview)
5. [Implementation Phases](#implementation-phases)
6. [Phase 1: Local Supabase Setup](#phase-1-local-supabase-setup)
7. [Phase 2: Docker Backend Container](#phase-2-docker-backend-container)
8. [Phase 3: Docker Compose Orchestration](#phase-3-docker-compose-orchestration)
9. [Phase 4: Testing Environment](#phase-4-testing-environment)
10. [Phase 5: Parallel Development (Optional)](#phase-5-parallel-development-optional)
11. [Migration Strategy](#migration-strategy)
12. [Success Metrics](#success-metrics)

---

## Executive Summary

This document outlines a plan to **add Docker-based local development and testing** to the User Story Mapping Tool project. Currently, the project runs entirely on the host machine and uses a cloud Supabase instance for E2E testing, which incurs costs and latency.

**What We're Building:**
- ✅ Local Supabase instance (PostgreSQL + Auth) running on host
- ✅ Dockerized NestJS backend with hot reload (using tsc --watch + nodemon)
- ✅ Docker Compose orchestration for backend service
- ✅ Fast local E2E testing against local Supabase
- ✅ Optional: Sprout integration for parallel development

**Current Setup:**
- Backend uses `tsc --watch & nodemon` for hot reload (not nest-cli)
- Port 3000 with `/api` global prefix
- Currently uses cloud Supabase for both dev AND testing
- No existing Docker setup or scripts directory

**What We're NOT Changing:**
- ❌ Existing E2E test strategy (keep everything in `E2E_TESTING_STRATEGY.md`)
- ❌ Test helpers, fixtures, factories (reuse as-is)
- ❌ Prisma schema or database structure
- ❌ NestJS application code

**Inspiration Source:**
The NIL Marketplace project (`david-franklin`) has a battle-tested Docker setup that we'll adapt. See [DOCKER_TESTING_SETUP.md](./DOCKER_TESTING_SETUP.md) for reference.

---

## Current State Analysis

### What Exists ✅

| Component | Status | Location |
|-----------|--------|----------|
| **NestJS Backend** | ✅ Working | `apps/backend/` |
| **Prisma ORM** | ✅ Configured | `apps/backend/prisma/schema.prisma` |
| **E2E Tests** | ✅ Comprehensive | `apps/backend/test/*.e2e-spec.ts` |
| **Test Helpers** | ✅ Complete | `apps/backend/test/helpers/` |
| **Factories & Fixtures** | ✅ Complete | `apps/backend/test/factories/`, `test/fixtures/` |
| **Cloud Supabase** | ✅ Working | Uses cloud instance (`.env.test`) |
| **Testing Strategy** | ✅ Documented | `docs/E2E_TESTING_STRATEGY.md` |

### What's Missing ❌

| Component | Impact | Priority |
|-----------|--------|----------|
| **Local Supabase** | 💰 Costs money, slower tests | 🔴 High |
| **Docker Setup** | 🚫 No containerization | 🟡 Medium |
| **docker-compose.yml** | 🚫 No service orchestration | 🟡 Medium |
| **Dockerfile** | 🚫 No backend container | 🟡 Medium |
| **Local Testing Env** | ⏰ Tests hit cloud DB | 🔴 High |
| **Parallel Dev Support** | 🚫 Port conflicts | 🟢 Low (nice-to-have) |

### Current Pain Points

1. **Cloud Supabase for Everything**
   - Both development AND testing use cloud instance
   - Current `.env` points to cloud: `aws-1-eu-west-1.pooler.supabase.com`
   - `.env.test` also uses cloud database
   - Costs accumulate with development + testing
   - Rate limits may apply

2. **Slow Test Feedback**
   - Network latency to cloud Supabase (EU region)
   - ~200-500ms added to each request
   - Tier 1 tests (8 test files) affected by network latency

3. **No Parallel Development**
   - Single developer at a time
   - Port 3000 conflicts if multiple branches
   - No worktree support

4. **No Local-First Development**
   - Requires internet connection for dev work
   - Can't work offline
   - Dependent on Supabase cloud uptime
   - EU region adds latency for US-based developers

---

## Goals & Benefits

### Primary Goals

1. **100% Local Development**
   - All services run locally
   - No cloud dependencies for development
   - Work offline

2. **Fast E2E Testing**
   - Tests against local Supabase
   - <50ms database latency
   - Faster CI/CD pipelines

3. **Cost Reduction**
   - Eliminate cloud Supabase costs for testing
   - Use cloud only for staging/production

4. **Developer Experience**
   - One command to start everything
   - Hot reload for code changes
   - Consistent environment across developers

### Secondary Goals (Nice-to-Have)

5. **Parallel Development**
   - Multiple developers/agents work simultaneously
   - Isolated environments per branch
   - No port conflicts

6. **CI/CD Ready**
   - Run tests in Docker containers
   - Reproducible test environment
   - Easy GitHub Actions integration

---

## Architecture Overview

### Target Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Host Machine (macOS)                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Local Supabase (via Supabase CLI)                   │   │
│  │  - PostgreSQL: localhost:54322                        │   │
│  │  - Auth API: localhost:54321                          │   │
│  │  - Studio UI: localhost:54323                         │   │
│  │  - Storage: localhost:54324                           │   │
│  └──────────────────────────────────────────────────────┘   │
│                            ▲                                 │
│                            │ (host.docker.internal)          │
│  ┌─────────────────────────┴────────────────────────────┐   │
│  │           Docker Compose Network                      │   │
│  │  ┌──────────────────────────────────────────────┐    │   │
│  │  │   Backend (NestJS + Prisma)                  │    │   │
│  │  │   - Port: 3000                                │    │   │
│  │  │   - Hot Reload: ✅                             │    │   │
│  │  │   - Volumes: src/ mapped                      │    │   │
│  │  └──────────────────────────────────────────────┘    │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Supabase on Host** | Supabase CLI manages local instance, easier than Docker |
| **Backend in Docker** | Consistent Node.js environment, hot reload works |
| **host.docker.internal** | Backend connects to Supabase on host machine |
| **Single Backend Service** | No frontend yet, keep it simple |
| **pnpm Workspaces** | Already configured, no changes needed |

---

## Implementation Phases

### Phase Overview

| Phase | Description | Duration | Priority |
|-------|-------------|----------|----------|
| **Phase 1** | Local Supabase Setup | 1 hour | 🔴 Critical |
| **Phase 2** | Docker Backend Container | 2 hours | 🔴 Critical |
| **Phase 3** | Docker Compose | 1 hour | 🔴 Critical |
| **Phase 4** | Testing Environment | 2 hours | 🔴 Critical |
| **Phase 5** | Parallel Development (Optional) | 3 hours | 🟢 Optional |

**Total Time: 6-9 hours** (depending on Phase 5)

---

## Phase 1: Local Supabase Setup

### Goal
Replace cloud Supabase with local instance for development and testing.

### Steps

#### 1.1 Install Supabase CLI

```bash
# Install Supabase CLI (macOS)
brew install supabase/tap/supabase

# Verify installation
supabase --version
```

#### 1.2 Initialize Supabase

```bash
# From project root
supabase init

# This creates:
# supabase/
# ├── config.toml       # Supabase configuration
# └── .gitignore        # Ignore local state
```

#### 1.3 Configure Supabase

**Edit `supabase/config.toml`:**

```toml
# API Server Configuration
[api]
enabled = true
port = 54321
schemas = ["public"]

# Database Configuration
[db]
port = 54322

# Studio Configuration (Web UI)
[studio]
enabled = true
port = 54323

# Auth Configuration
[auth]
enabled = true
site_url = "http://localhost:3000"
jwt_expiry = 3600

# Email Configuration (local dev - no confirmations needed)
[auth.email]
enable_signup = true
enable_confirmations = false  # Disable for local dev

# Storage Configuration
[storage]
enabled = true
file_size_limit = "50MiB"
```

#### 1.4 Start Local Supabase

```bash
# Start all Supabase services
supabase start

# Output shows:
# - API URL: http://localhost:54321
# - DB URL: postgresql://postgres:postgres@localhost:54322/postgres
# - Studio URL: http://localhost:54323
# - anon key: eyJhbG...
# - service_role key: eyJhbG...
```

#### 1.5 Apply Prisma Schema to Local Database

```bash
# From project root, navigate to backend
cd apps/backend

# Temporarily set DATABASE_URL to local Supabase
export DATABASE_URL="postgresql://postgres:postgres@localhost:54322/postgres"
export DIRECT_URL="postgresql://postgres:postgres@localhost:54322/postgres"

# Apply existing migrations to local database
# Note: Migrations already exist in prisma/migrations/
pnpm prisma migrate deploy

# Generate Prisma client
pnpm prisma generate

# (Optional) Seed database with test data
pnpm prisma db seed
```

**Verify schema applied:**

```bash
# Check tables were created
supabase db status

# Or connect to database directly
psql "postgresql://postgres:postgres@localhost:54322/postgres" -c "\dt"

# Should see tables: journeys, steps, releases, stories, etc.
```

### Phase 1 Deliverables

- ✅ `supabase/config.toml` configured
- ✅ Local Supabase running on ports 54321/54322/54323
- ✅ Prisma schema applied to local database (existing migrations deployed)
- ✅ `apps/backend/.env.local` created with local Supabase credentials

**Test Commands:**
```bash
# Verify Supabase is running
supabase status

# Should show all services as "healthy"
# Example output:
#   API URL: http://localhost:54321
#   DB URL: postgresql://postgres:postgres@localhost:54322/postgres
#   Studio URL: http://localhost:54323

# Verify tables exist
psql "postgresql://postgres:postgres@localhost:54322/postgres" -c "\dt"

# Should list: journeys, steps, releases, stories, personas, tags, comments, story_links
```

---

## Phase 2: Docker Backend Container

### Goal
Create a Dockerfile for the NestJS backend with hot reload support.

### Steps

#### 2.1 Create Dockerfile

**Create `Dockerfile` in project root:**

```dockerfile
# Base stage - Node.js with pnpm
FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

# Development stage
FROM base AS development
# Install procps and curl for hot reload and healthcheck support
# - procps: provides 'ps' command needed by nodemon
# - curl: needed for healthcheck in docker-compose.yml
RUN apt-get update && apt-get install -y procps curl && rm -rf /var/lib/apt/lists/*

# Copy workspace configuration files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

# Copy all workspace packages
COPY apps ./apps
COPY libs ./libs

# Install dependencies with cache mount for faster rebuilds
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

# Generate Prisma client
RUN pnpm --filter @user-story-mapping/backend exec prisma generate

# Build TypeScript (required for nodemon)
RUN pnpm --filter @user-story-mapping/backend build

# Expose backend port
EXPOSE 3000

# Health check is defined in docker-compose.yml for easier customization

# Start in dev mode (tsc --watch + nodemon)
# Note: This project uses tsc --watch + nodemon, not nest start --watch
CMD ["pnpm", "--filter", "@user-story-mapping/backend", "dev"]
```

#### 2.2 Create .dockerignore

**Create `.dockerignore` in project root:**

```
# Dependencies
node_modules
apps/*/node_modules
libs/*/node_modules

# Build outputs
dist
build
apps/*/dist
apps/*/build

# Environment files (keep examples)
.env
.env.*
!.env.example

# Logs
*.log
npm-debug.log*
pnpm-debug.log*

# Testing
coverage
.nyc_output

# Git
.git
.github

# IDE
.vscode
.idea
*.swp
*.swo

# OS files
.DS_Store
Thumbs.db

# Docker
Dockerfile*
docker-compose*.yml
.dockerignore

# Supabase local state
supabase/.branches
supabase/.temp

# Documentation
docs
thoughts
*.md
!README.md
```

#### 2.3 Test Docker Build

```bash
# Build the Docker image
docker build --target development -t user-story-mapping-backend:dev .

# Run container (without compose for now)
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://postgres:postgres@host.docker.internal:54322/postgres" \
  user-story-mapping-backend:dev
```

### Phase 2 Deliverables

- ✅ `Dockerfile` created with multi-stage build
- ✅ `.dockerignore` excludes unnecessary files
- ✅ Backend builds successfully in Docker
- ✅ Hot reload works inside container

---

## Phase 3: Docker Compose Orchestration

### Goal
Create Docker Compose configuration for easy service management.

### Steps

#### 3.1 Create docker-compose.yml

**Create `docker-compose.yml` in project root:**

```yaml
services:
  # Backend (NestJS + Prisma)
  backend:
    container_name: ${COMPOSE_PROJECT_NAME:-user-story-mapping}_backend
    build:
      context: .
      dockerfile: Dockerfile
      target: development
    working_dir: /app
    command: pnpm --filter @user-story-mapping/backend dev
    env_file:
      - apps/backend/.env.local
    environment:
      - NODE_ENV=development
      # Override database URL to use host.docker.internal for Docker -> Host communication
      - DATABASE_URL=postgresql://postgres:postgres@host.docker.internal:54322/postgres
      - DIRECT_URL=postgresql://postgres:postgres@host.docker.internal:54322/postgres
      - SUPABASE_URL=http://host.docker.internal:54321
    ports:
      - "${BACKEND_PORT:-3000}:3000"
    volumes:
      # Map entire project (for pnpm workspaces)
      - .:/app
      # Anonymous volumes to prevent node_modules conflicts
      - /app/node_modules
      - /app/apps/backend/node_modules
      # Preserve container's built dist/ directory
      # Critical: Without this, fresh clones fail (host has no dist/ as it's gitignored)
      - /app/apps/backend/dist
    # Log rotation to prevent bloat (industry standard)
    logging:
      driver: "json-file"
      options:
        max-size: "50m"
        max-file: "5"
    # Hot reload support
    develop:
      watch:
        - action: sync
          path: ./apps/backend/src
          target: /app/apps/backend/src
          ignore:
            - node_modules/
        - action: rebuild
          path: ./apps/backend/package.json
        - action: sync
          path: ./apps/backend/prisma
          target: /app/apps/backend/prisma
          ignore:
            - dev.db
            - dev.db-journal
    # Health check
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 10s
    # Restart policy
    restart: unless-stopped
```

#### 3.2 Create Environment Files

**Create `.env.example` in project root:**

```bash
# Docker Compose Configuration
COMPOSE_PROJECT_NAME=user-story-mapping
BACKEND_PORT=3000
```

**Update `apps/backend/.env.local`:**

```bash
# Development Environment
NODE_ENV=development
PORT=3000
API_PREFIX=api

# Local Supabase Configuration
# IMPORTANT: Use host.docker.internal when running in Docker
DATABASE_URL="postgresql://postgres:postgres@host.docker.internal:54322/postgres"
DIRECT_URL="postgresql://postgres:postgres@host.docker.internal:54322/postgres"
SUPABASE_URL="http://host.docker.internal:54321"
SUPABASE_ANON_KEY="your-anon-key-from-supabase-start"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key-from-supabase-start"

# CORS
CORS_ORIGIN=http://localhost:3000
```

**Create `.env.test.local` for Docker testing:**

```bash
# Test Environment (Docker)
NODE_ENV=test
PORT=3001
API_PREFIX=api

# Local Supabase for Testing
# Use localhost when running tests on host, host.docker.internal when in Docker
DATABASE_URL="postgresql://postgres:postgres@localhost:54322/postgres"
DIRECT_URL="postgresql://postgres:postgres@localhost:54322/postgres"
SUPABASE_URL="http://localhost:54321"
SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```

#### 3.3 Create Scripts Directory and Smart Scripts

**Create scripts directory:**

```bash
mkdir -p scripts
```

**Create `scripts/smart-start.js`:**

```javascript
#!/usr/bin/env node
/**
 * Smart Start Script
 * Starts Supabase + Docker services
 */

const { execSync } = require('child_process');

function execCommand(command) {
  try {
    execSync(command, { stdio: 'inherit' });
  } catch (error) {
    process.exit(1);
  }
}

console.log('🚀 Starting Development Environment\n');

console.log('▸ Starting Supabase...');
execCommand('supabase start');

console.log('\n▸ Starting Docker services...');
execCommand('docker compose up --build -d');

console.log('\n✅ Services started!');
console.log('Backend: http://localhost:3000/api/health');
console.log('API Docs: http://localhost:3000/api/docs');
console.log('Supabase Studio: http://localhost:54323\n');
```

**Create `scripts/smart-stop.js`:**

```javascript
#!/usr/bin/env node
/**
 * Smart Stop Script
 * Stops Docker + Supabase services
 */

const { execSync } = require('child_process');

function execCommand(command) {
  try {
    execSync(command, { stdio: 'inherit' });
  } catch (error) {
    console.error('Error:', error.message);
  }
}

console.log('🛑 Stopping Development Environment\n');

console.log('▸ Stopping Docker services...');
execCommand('docker compose down');

console.log('▸ Stopping Supabase...');
execCommand('supabase stop');

console.log('\n✅ All services stopped\n');
```

**Make scripts executable:**

```bash
chmod +x scripts/smart-start.js
chmod +x scripts/smart-stop.js
```

#### 3.4 Update package.json Scripts

**Add to root `package.json`:**

```json
{
  "scripts": {
    "local:start": "node scripts/smart-start.js",
    "local:stop": "node scripts/smart-stop.js",
    "docker:dev": "docker compose up --watch",
    "docker:down": "docker compose down",
    "docker:build": "docker compose build",
    "docker:logs": "docker compose logs -f",
    "supabase:start": "supabase start",
    "supabase:stop": "supabase stop",
    "supabase:status": "supabase status"
  }
}
```

### Phase 3 Deliverables

- ✅ `docker-compose.yml` orchestrates backend
- ✅ Environment files configured
- ✅ Smart scripts automate startup/shutdown
- ✅ pnpm scripts added for convenience

**Test Commands:**
```bash
# Start everything
pnpm local:start

# Check status
pnpm supabase:status
docker compose ps

# Test backend is working
curl http://localhost:3000/api/health

# View API docs (Scalar UI)
open http://localhost:3000/api/docs

# View logs
pnpm docker:logs

# Stop everything
pnpm local:stop
```

**Verify Hot Reload:**
```bash
# Make a change to apps/backend/src/main.ts
# Watch Docker logs - should see TypeScript recompiling and nodemon restarting
pnpm docker:logs
```

---

## Phase 4: Testing Environment

### Goal
Enable E2E tests to run against local Supabase instead of cloud.

### Understanding Test Isolation Strategy

**IMPORTANT**: This project uses **PARALLEL execution with isolated databases** for maximum speed.

**Current Strategy:**

```json
// apps/backend/test/jest-e2e.json
{
  "maxWorkers": "50%",  // ← 50% of CPU cores run in PARALLEL (adaptive)
  "testTimeout": 30000
}
```

**Architecture (Example: 8-core system → 4 workers):**

```
┌─────────────────────────────────────────────────────────────┐
│         Jest Test Runner (50% of cores = 4 workers)          │
├────────────────┬─────────────┬─────────────┬────────────────┤
│   Worker 1     │  Worker 2   │  Worker 3   │   Worker 4     │
│  test_db_1     │  test_db_2  │  test_db_3  │  test_db_4     │
├────────────────┼─────────────┼─────────────┼────────────────┤
│ auth.e2e-spec  │ journeys... │ releases... │ tags.e2e-spec  │
│ health.e2e-... │ steps.e2... │ stories...  │ personas.e2... │
│ comments.e2... │ storyLinks..│ ...         │ ...            │
│ (+ more)       │ (+ more)    │ (+ more)    │ (+ more)       │
└────────────────┴─────────────┴─────────────┴────────────────┘

Note: Actual worker count depends on CPU cores (50% = 2 on 4-core, 4 on 8-core, etc.)
```

**How Isolation Works:**

1. **Isolated Databases Per Worker**
   - Each worker has its own PostgreSQL database
   - Databases: `test_db_1`, `test_db_2`, `test_db_3`, `test_db_4`, ... (based on worker count)
   - Worker ID determines which database to use
   - **PERFECT isolation** for database operations

2. **Parallel Execution Across Workers**
   - Multiple test suites run simultaneously (one per worker)
   - Jest automatically distributes test files to workers
   - Example: 16 test files with 4 workers → 4 files per worker average
   - Worker count adapts to system (50% of CPU cores)

3. **Sequential Execution Within Worker**
   - Tests within each worker run one at a time (default Jest behavior)
   - Ensures clean database state for each test
   - Database wiped before each test in that worker

4. **Complete Database Wipe Before Each Test**
   ```typescript
   // test/setup.ts (runs per worker)
   beforeEach(async () => {
     await resetDatabase();      // Delete ALL data in this worker's DB (PERFECT isolation)
     await deleteAllTestUsers(); // Delete ALL auth users (SHARED - see limitation below)
   });
   ```

   ⚠️ **Auth Isolation Limitation:**
   - Database isolation is **PERFECT** (separate DBs per worker)
   - Auth isolation is **IMPERFECT** (all workers share same Supabase Auth instance)
   - Auth users may leak between workers in parallel mode
   - **Mitigation:** Use unique email addresses per test (UUID/timestamp-based)
   - See `test/helpers/auth-cleanup.ts` for detailed explanation

5. **Worker-Based Database Routing**
   ```typescript
   // Automatically routes based on JEST_WORKER_ID
   const workerId = process.env.JEST_WORKER_ID || '1';
   const dbName = `test_db_${workerId}`;
   process.env.DATABASE_URL = `postgresql://postgres:postgres@localhost:54322/${dbName}`;
   ```

**Benefits:**

| Aspect | Result |
|--------|--------|
| **Speed** | ✅ Near-linear speedup (N workers = N× faster) |
| **DB Isolation** | ✅ PERFECT (separate databases per worker) |
| **Auth Isolation** | ⚠️ IMPERFECT (shared Supabase Auth - see limitation above) |
| **Reliability** | ✅ No race conditions (sequential within worker) |
| **Scalability** | ✅ Adapts to system (50% of cores) |
| **Portability** | ✅ Works on 2-core to 16-core systems |

**Performance (Example: 8-core system = 4 workers):**
- **16 test files** → 4 rounds (4 + 4 + 4 + 4) → **~6-8 seconds total**
- **32 test files** → 8 rounds → **~12-16 seconds total**
- **Previous serial execution**: 16 files → **~24-32 seconds**
- **Speed improvement**: **60-75% faster**

**Different System Performance:**
- **2-core system** (1 worker): Similar to serial
- **4-core system** (2 workers): ~50% faster
- **8-core system** (4 workers): ~75% faster
- **16-core system** (8 workers): ~87% faster (with 16+ test files)

**Setup Required:**
1. Run `pnpm test:setup` to create test databases (auto-detects cores)
2. Apply Prisma migrations to each database (script handles this)
3. Jest automatically handles worker distribution

### Why Parallel Execution with Isolated Databases?

**Industry Best Practice** for E2E testing with growing test suites.

**Test Independence Principle:**

> "Keep tests independent - each test should be independent of others, and the order of test execution should not affect the test results."
>
> — E2E Testing Best Practices (2025)

**How We Achieve This:**
1. ✅ Each worker has completely isolated database (test_db_1, test_db_2, ...)
2. ✅ Global `beforeEach` wipes database before each test within worker
3. ✅ No shared state between workers (except Auth - see limitation)
4. ✅ Failures don't affect other workers or tests
5. ✅ 60-75% faster than serial execution
6. ✅ Adapts to system capabilities (50% of CPU cores)

**Scaling Strategy:**
- **16 test files** (current): 4 workers = 4 rounds = ~6-8 seconds
- **32 test files**: 4 workers = 8 rounds = ~12-16 seconds
- **64 test files**: 8 workers = 8 rounds = ~12-16 seconds (on 16-core system)
- Worker count automatically scales with CPU cores (50% utilization)

#### 🎯 Validation Summary

**Our approach is VALIDATED as:**
- ✅ **Industry standard** for small to medium test suites
- ✅ **Best practice** for shared database resources
- ✅ **Recommended pattern** for Supabase + NestJS E2E testing
- ✅ **Right choice** for this project size and complexity

**Migration Recommendation**: **KEEP CURRENT STRATEGY** - No changes needed to test isolation approach. The implementation plan should focus on migrating from cloud to local Supabase while maintaining the existing test execution strategy.

**Future Consideration**: Re-evaluate if test suite grows beyond 50 test files or individual test execution time exceeds 30 seconds.

### Steps

#### 4.1 Update Test Environment Configuration

**Current state check:**

```bash
# View current .env.test
cat apps/backend/.env.test

# Should show cloud Supabase URL:
# DATABASE_URL="postgresql://postgres.hthsfmaiidjknnvpqgfg:...@aws-1-eu-west-1.pooler.supabase.com..."
```

**Backup existing cloud config:**

```bash
# Save cloud config as backup
cp apps/backend/.env.test apps/backend/.env.test.cloud.backup
```

**Update `apps/backend/.env.test` to use local Supabase:**

```bash
# Test Environment Configuration
# This file is used for E2E tests with LOCAL Supabase

# Test Database Connection (Local Supabase)
# Run 'supabase start' and copy keys from output
DATABASE_URL="postgresql://postgres:postgres@localhost:54322/postgres"
DIRECT_URL="postgresql://postgres:postgres@localhost:54322/postgres"

# Supabase Configuration (Local)
# Get these keys from 'supabase start' output
SUPABASE_URL="http://localhost:54321"
SUPABASE_ANON_KEY="<paste-anon-key-from-supabase-start>"
SUPABASE_SERVICE_ROLE_KEY="<paste-service-role-key-from-supabase-start>"

# Test Configuration
NODE_ENV=test
PORT=3001
API_PREFIX=api
```

**Get Supabase keys:**

```bash
# Start Supabase and capture keys
supabase start

# Look for output like:
#   anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
#   service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### 4.2 Create Test Databases Script

**Goal**: Automate creation of isolated test databases for parallel execution.

**NOTE**: The setup script has been implemented as an interactive Node.js script at `scripts/setup-test-databases.js`. It automatically detects your CPU cores and creates the appropriate number of test databases (50% of cores, matching Jest's maxWorkers setting).

**Features of the setup script:**
- Auto-detects CPU cores and calculates optimal worker count
- Interactive prompts with input validation
- Checks prerequisites (Supabase running, psql installed)
- Detects existing databases and confirms before recreating
- Detects orphaned databases from previous runs with different worker counts
- Terminates active connections before database operations
- Applies Prisma migrations to all databases
- Comprehensive error handling with actionable messages

**The script is available via:**

```bash
pnpm test:setup
```

**Run it:**

```bash
# Ensure Supabase is running first
supabase start

# Create test databases (auto-detects optimal worker count)
pnpm test:setup
```

**Expected output:**

```
🗄️  Setting up parallel test databases...

📋 Configuration:
   Host: localhost:54322
   Workers: 4
   Databases: test_db_1 through test_db_4

Step 1: Creating databases...

🔨 Creating database: test_db_1
   ✅ Created: test_db_1
🔨 Creating database: test_db_2
   ✅ Created: test_db_2
🔨 Creating database: test_db_3
   ✅ Created: test_db_3
🔨 Creating database: test_db_4
   ✅ Created: test_db_4

Step 2: Applying Prisma migrations...

📦 Applying migrations to: test_db_1
   ✅ Migrations applied: test_db_1

📦 Applying migrations to: test_db_2
   ✅ Migrations applied: test_db_2

📦 Applying migrations to: test_db_3
   ✅ Migrations applied: test_db_3

📦 Applying migrations to: test_db_4
   ✅ Migrations applied: test_db_4

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Test databases setup complete!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Created databases:
   • test_db_1
   • test_db_2
   • test_db_3
   • test_db_4

You can now run parallel E2E tests:
   cd apps/backend
   pnpm test:e2e

Jest will automatically distribute tests across 4 workers,
each using its own isolated database.
```

**When to re-run this script:**
- After `supabase db reset` (wipes all databases)
- After adding new Prisma migrations
- When setting up a new development environment
- After destroying and recreating Supabase container

#### 4.3 Update Test Setup

**Modify `apps/backend/test/setup.ts` (add worker-based routing):**

```typescript
/**
 * Global test setup for E2E tests - PARALLEL EXECUTION
 *
 * This file is executed once per worker before tests (configured in jest-e2e.json)
 *
 * PARALLEL ARCHITECTURE:
 * - 4 workers run simultaneously (maxWorkers: 4)
 * - Each worker has its own isolated database (test_db_1, test_db_2, test_db_3, test_db_4)
 * - Worker ID determines which database to use
 * - Tests within each worker run sequentially
 * - Database is wiped before each test in that worker
 *
 * This file sets up:
 * - Worker-specific database routing via JEST_WORKER_ID
 * - Environment variables from .env.test
 * - Global beforeEach hooks for database cleanup
 * - Global afterAll hooks for disconnection
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { resetDatabase, disconnectDatabase } from './helpers/database';
import { deleteAllTestUsers } from './helpers/auth-cleanup';

// Load test environment variables
dotenv.config({ path: path.join(__dirname, '../.env.test') });

/**
 * Get worker-specific database name
 * Jest assigns JEST_WORKER_ID as '1', '2', '3', '4' for parallel workers
 * We route each worker to its own database for complete isolation
 */
const getWorkerDatabaseName = (): string => {
  const workerId = process.env.JEST_WORKER_ID || '1';
  return `test_db_${workerId}`;
};

/**
 * Override DATABASE_URL and DIRECT_URL to use worker-specific database
 * This ensures each worker has complete database isolation
 */
const dbName = getWorkerDatabaseName();
const baseUrl = 'postgresql://postgres:postgres@localhost:54322';
process.env.DATABASE_URL = `${baseUrl}/${dbName}`;
process.env.DIRECT_URL = `${baseUrl}/${dbName}`;

console.log(`[Worker ${process.env.JEST_WORKER_ID || '1'}] Using database: ${dbName}`);

/**
 * Global beforeEach hook
 * Cleans database and auth users before EACH test
 *
 * CRITICAL: Clean before (not after) to ensure test isolation
 * even when tests fail or timeout
 */
beforeEach(async () => {
  try {
    // Clean database tables (Prisma)
    await resetDatabase();

    // Clean Supabase Auth users (they persist beyond Prisma)
    await deleteAllTestUsers();
  } catch (error) {
    console.error('Setup failed in beforeEach:', error);
    throw error;
  }
}, 30000); // 30 second timeout for cleanup

/**
 * Global afterAll hook
 * Disconnects from database after all tests complete
 */
afterAll(async () => {
  try {
    await disconnectDatabase();
  } catch (error) {
    console.error('Teardown failed in afterAll:', error);
    throw error;
  }
}, 10000); // 10 second timeout for disconnection
```

**Key changes:**
1. Added `getWorkerDatabaseName()` function to route based on `JEST_WORKER_ID`
2. Override `DATABASE_URL` and `DIRECT_URL` with worker-specific database
3. Console log shows which worker is using which database
4. Updated comments to reflect parallel execution architecture

#### 4.4 Create Test Workflow Documentation

**Update `docs/E2E_TESTING_STRATEGY.md` with Docker section:**

Add this section after "Database Strategy":

```markdown
## Running Tests Locally vs Docker

### Local (Host Machine) - Recommended for TDD

```bash
# Ensure Supabase is running
supabase status

# Run tests on host
cd apps/backend
pnpm test:e2e

# Watch mode for TDD
pnpm test:e2e:watch
```

**Pros:**
- ✅ Fastest feedback loop
- ✅ Direct debugging
- ✅ No Docker overhead

**Cons:**
- ❌ Requires local Node.js setup
- ❌ Potential environment differences

### Docker - Matches CI/CD Environment

```bash
# Start Supabase on host (still needed)
supabase start

# Run tests inside Docker container
docker compose exec backend pnpm test:e2e

# Or rebuild and test
docker compose up --build -d
docker compose exec backend pnpm test:e2e
```

**Pros:**
- ✅ Matches CI/CD exactly
- ✅ Isolated environment
- ✅ No host dependencies

**Cons:**
- ❌ Slower than host
- ❌ More complex debugging
```

#### 4.5 Verify Test Migration

**Run tests against local Supabase:**

```bash
# 1. Start local Supabase
supabase start

# 2. Update .env.test with local Supabase credentials
# (Copy keys from supabase start output)

# 3. Run E2E tests
cd apps/backend
pnpm test:e2e

# Expected: All tests pass (same as before, but faster!)
```

**Compare performance:**

```bash
# Before (cloud Supabase - EU region, serial execution):
# Test Suites: 16 passed, 16 total (all E2E test files)
# Time: ~30-45 seconds (network latency to EU + serial execution)

# After (local Supabase + parallel workers with 50% cores):
# Test Suites: 16 passed, 16 total
# Time: ~6-8 seconds (80-85% faster!)
# Network latency: <5ms (localhost)
# Execution: 4 workers in parallel (on 8-core system)
```

**Note**: Your actual results may vary. The key benefits are:
1. **No network latency** - Local Supabase eliminates cloud round trips
2. **Parallel execution** - 4 workers run simultaneously
3. **Consistent performance** - No network variability

**Understanding the Numbers:**

```bash
# 16 test files with parallel execution (maxWorkers: "50%" on 8-core = 4 workers):
# Round 1 (parallel): health, auth, journeys, steps (all run simultaneously)
# Round 2 (parallel): releases, stories, tags, personas (all run simultaneously)
# Round 3 (parallel): comments, storyLinks, ... (all run simultaneously)
# Round 4 (parallel): remaining tests (all run simultaneously)
#
# If each test takes ~1-2 seconds:
# - Round 1: ~2 seconds (slowest test in the batch)
# - Round 2: ~2 seconds
# - Round 3: ~2 seconds
# - Round 4: ~2 seconds
# TOTAL: ~6-8 seconds
#
# Compare to serial execution (maxWorkers: 1):
# - Each test runs one after another
# - 16 tests × 2 seconds average = ~32 seconds
#
# Speed improvement: 75-80% faster with parallel execution
#
# On different systems:
# - 2-core (1 worker): 16 rounds × 2s = ~32s (similar to serial)
# - 4-core (2 workers): 8 rounds × 2s = ~16s (50% faster)
# - 8-core (4 workers): 4 rounds × 2s = ~8s (75% faster)
# - 16-core (8 workers): 2 rounds × 2s = ~4s (87% faster)
```

**Expected console output:**

```bash
$ cd apps/backend && pnpm test:e2e

[Worker 1] Using database: test_db_1
[Worker 2] Using database: test_db_2
[Worker 3] Using database: test_db_3
[Worker 4] Using database: test_db_4

 PASS  test/auth.e2e-spec.ts (Worker 2)
 PASS  test/health.e2e-spec.ts (Worker 1)
 PASS  test/journeys.e2e-spec.ts (Worker 3)
 PASS  test/steps.e2e-spec.ts (Worker 4)
 PASS  test/releases.e2e-spec.ts (Worker 1)
 PASS  test/stories.e2e-spec.ts (Worker 2)
 PASS  test/tags.e2e-spec.ts (Worker 3)
 PASS  test/personas.e2e-spec.ts (Worker 4)
 PASS  test/comments.e2e-spec.ts (Worker 1)
 PASS  test/story-links.e2e-spec.ts (Worker 2)
 ... (6 more test files)

Test Suites: 16 passed, 16 total
Tests:       89 passed, 89 total
Time:        7.123 s
Ran all test suites.
```

### Phase 4 Deliverables

- ✅ Tests run against local Supabase (no cloud costs)
- ✅ `.env.test` updated with local credentials
- ✅ Isolated test databases created (auto-scales with CPU cores)
- ✅ Parallel execution with 50% of CPU cores configured
- ✅ Worker-based database routing implemented with lazy Prisma client
- ✅ Performance improvement: **75-85% faster** than cloud + serial
- ✅ Test isolation strategy: PERFECT database isolation, documented auth limitation
- ✅ Portable across systems (2-core to 16-core automatic adaptation)
- ✅ Cloud Supabase config backed up to `.env.test.cloud.backup`

---

## Phase 5: Parallel Development (Optional)

### Goal
Enable multiple developers/agents to work on different branches simultaneously without port conflicts.

**Note**: This phase is OPTIONAL and can be skipped if not needed.

### Steps

#### 5.1 Install Sprout CLI

```bash
# Install pipx (Python package manager)
brew install pipx
pipx ensurepath

# Install Sprout
pipx install git+https://github.com/SecDev-Lab/sprout.git

# Verify
~/.local/bin/sprout --version
```

#### 5.2 Create Sprout Template

**Update root `.env.example` with Sprout syntax:**

```bash
# Sprout template syntax
COMPOSE_PROJECT_NAME=user-story-mapping-{{ branch() }}
BACKEND_PORT={{ auto_port() }}
GIT_BRANCH={{ branch() }}
```

#### 5.3 Create Sprout Wrapper Script

**Create `sprout-create.sh` in root:**

```bash
#!/bin/bash
# Sprout wrapper script with automatic branch name sanitization
# Usage: ./sprout-create.sh <branch-name>

set -e

if [ -z "$1" ]; then
  echo "❌ Error: Branch name required"
  echo "Usage: ./sprout-create.sh <branch-name>"
  echo "Example: ./sprout-create.sh feature/my-feature"
  exit 1
fi

BRANCH_NAME="$1"

# Create the worktree using Sprout
echo "Creating worktree for branch: $BRANCH_NAME"
~/.local/bin/sprout create "$BRANCH_NAME"

# Find the worktree directory
WORKTREE_PATH=$(git worktree list | grep "$BRANCH_NAME" | awk '{print $1}')

if [ -z "$WORKTREE_PATH" ]; then
  echo "❌ Error: Could not find worktree for $BRANCH_NAME"
  exit 1
fi

echo "📍 Worktree created at: $WORKTREE_PATH"

# Fix slashes in .env file if it exists
if [ -f "$WORKTREE_PATH/.env" ]; then
  echo "🔧 Sanitizing branch name slashes in .env file..."
  sed -i '' 's|/|-|g' "$WORKTREE_PATH/.env"

  echo "✅ .env file sanitized successfully!"
  echo ""
  echo "Generated configuration:"
  grep -E "COMPOSE_PROJECT_NAME|BACKEND_PORT" "$WORKTREE_PATH/.env"
else
  echo "⚠️  Warning: No .env file found at $WORKTREE_PATH/.env"
fi

echo ""
echo "✅ Workspace '$BRANCH_NAME' is ready!"
echo ""
echo "Next steps:"
echo "  cd $WORKTREE_PATH"
echo "  cp apps/backend/.env.local apps/backend/.env.local"
echo "  docker compose up -d"
```

**Make executable:**

```bash
chmod +x sprout-create.sh
```

#### 5.4 Add pnpm Scripts

**Add to root `package.json`:**

```json
{
  "scripts": {
    "sprout:new": "./sprout-create.sh",
    "sprout:list": "~/.local/bin/sprout ls",
    "sprout:remove": "~/.local/bin/sprout rm"
  }
}
```

#### 5.5 Test Parallel Development

```bash
# Create isolated worktree
./sprout-create.sh feature/new-feature

# Navigate to worktree
cd .sprout/feature/new-feature

# Copy environment file
cp apps/backend/.env.local apps/backend/.env.local

# Start services (unique ports!)
docker compose up -d

# Check assigned port
cat .env
# BACKEND_PORT=40123 (auto-assigned)

# Access backend
curl http://localhost:40123/api/health
```

### Phase 5 Deliverables

- ✅ Sprout CLI installed
- ✅ Sprout template configured in `.env.example`
- ✅ Wrapper script created
- ✅ pnpm scripts added
- ✅ Parallel development tested

---

## Migration Strategy

### For Existing Developers

**Prerequisites Check:**

```bash
# Check Node.js version (>= 18.0.0)
node --version

# Check pnpm version (>= 8.0.0)
pnpm --version

# Check if Docker is installed
docker --version

# Check if psql is installed (for verification)
psql --version
```

**Step 1: Install Prerequisites**

```bash
# Install Supabase CLI (macOS)
brew install supabase/tap/supabase

# Verify installation
supabase --version

# Install Docker Desktop if not already installed
# Download from https://www.docker.com/products/docker-desktop
# After install, start Docker Desktop and wait for it to fully start

# (Optional) Install psql for database verification
brew install postgresql@16
```

**Step 2: Set Up Local Environment**

```bash
# Pull latest code
git pull origin main

# Install dependencies (if fresh clone)
pnpm install

# Initialize Supabase (from project root)
supabase init  # Creates supabase/config.toml
supabase start  # Starts local services

# IMPORTANT: Copy the output from 'supabase start'
# You'll need these values:
#   - anon key
#   - service_role key

# Create local environment file
cp apps/backend/.env.example apps/backend/.env.local

# Edit apps/backend/.env.local and update:
# - DATABASE_URL="postgresql://postgres:postgres@localhost:54322/postgres"
# - DIRECT_URL="postgresql://postgres:postgres@localhost:54322/postgres"
# - SUPABASE_URL="http://localhost:54321"
# - SUPABASE_ANON_KEY="<paste-from-supabase-start>"
# - SUPABASE_SERVICE_ROLE_KEY="<paste-from-supabase-start>"

# Apply Prisma migrations to local database
cd apps/backend
export DATABASE_URL="postgresql://postgres:postgres@localhost:54322/postgres"
pnpm prisma migrate deploy
pnpm prisma generate
cd ../..

# Start Docker services
pnpm local:start
```

**Step 3: Migrate Tests**

```bash
# Update .env.test with local Supabase credentials
# (Use same keys from supabase start)

# Run tests to verify
cd apps/backend
pnpm test:e2e
```

**Step 4: Delete Cloud Supabase (Optional)**

```bash
# Once confident in local setup:
# - Delete cloud Supabase test project
# - Save ~$25/month
```

### Backward Compatibility

**Keep cloud Supabase as fallback:**

- Don't delete cloud project immediately
- Document both setups in README
- Transition gradually over 1-2 weeks

---

## Success Metrics

### Phase 1-3 Success Criteria

- [ ] `supabase start` runs without errors
- [ ] Local Supabase accessible at `localhost:54321/54322/54323`
- [ ] Prisma migrations deployed to local database
- [ ] Tables created (verify with `\dt` in psql)
- [ ] Backend builds in Docker successfully
- [ ] `pnpm local:start` starts all services
- [ ] Backend accessible at `http://localhost:3000/api/health`
- [ ] API docs accessible at `http://localhost:3000/api/docs`
- [ ] Hot reload works when editing `apps/backend/src/**/*.ts`

### Phase 4 Success Criteria

- [ ] All E2E tests pass against local Supabase (8/8 test files)
- [ ] Tests are ≥40% faster than cloud Supabase (~8-12s vs 15-25s)
- [ ] Zero test flakiness
- [ ] `pnpm test:e2e` works on fresh checkout
- [ ] Database cleanup verified (empty after each test)
- [ ] Serial execution confirmed (maxWorkers: 1)
- [ ] Test isolation validated (no cross-test pollution)

### Phase 5 Success Criteria (Optional)

- [ ] Multiple worktrees run simultaneously
- [ ] No port conflicts
- [ ] Each worktree has isolated database
- [ ] Cleanup removes all Docker resources

### Long-Term Success

- [ ] All developers using local Supabase
- [ ] Cloud Supabase test project deleted
- [ ] CI/CD runs tests in Docker
- [ ] Documentation complete and accurate
- [ ] Zero onboarding issues for new developers

---

## Risk Mitigation

### Risk 1: Supabase CLI Issues

**Risk**: Supabase CLI doesn't work on macOS
**Likelihood**: Low
**Mitigation**: Supabase CLI is mature and well-tested on macOS
**Fallback**: Run Supabase services in Docker (add to docker-compose.yml)

**Alternative Docker Setup:**
```yaml
# If Supabase CLI doesn't work, add to docker-compose.yml:
  postgres:
    image: supabase/postgres:15.6.1.80
    ports:
      - "54322:5432"
    environment:
      POSTGRES_PASSWORD: postgres
```

### Risk 2: Docker Performance (Hot Reload)

**Risk**: Hot reload slow in Docker on macOS (tsc --watch + nodemon)
**Likelihood**: Medium (Docker Desktop file system performance)
**Mitigation**:
- Anonymous volumes for node_modules (already in docker-compose.yml)
- Docker watch mode with sync action
- Use VirtioFS for better performance (Docker Desktop setting)
**Fallback**: Run backend on host machine, skip Docker for development

**Host-based Development (Fallback):**
```bash
# Use local Supabase but run backend on host
supabase start
cd apps/backend
pnpm dev  # Runs natively, very fast
```

### Risk 3: Test Failures

**Risk**: Tests fail with local Supabase but pass with cloud
**Likelihood**: Low (same PostgreSQL version, same schema)
**Mitigation**:
- Test one suite at a time during migration
- Verify Prisma client generation
- Check all migrations applied
- Verify Supabase keys copied correctly
**Fallback**: Keep cloud config as `.env.test.cloud.backup`

**Common Issues:**
```bash
# Issue: Tests can't connect to database
# Fix: Ensure Supabase is running
supabase status

# Issue: Tables don't exist
# Fix: Apply migrations
pnpm prisma migrate deploy

# Issue: Auth tests fail
# Fix: Verify Supabase keys in .env.test
echo $SUPABASE_SERVICE_ROLE_KEY
```

### Risk 4: Developer Adoption

**Risk**: Developers resist switching from cloud setup
**Likelihood**: Medium
**Mitigation**: Show speed improvements, cost savings
**Fallback**: Support both setups temporarily

---

## Next Steps

### Immediate Actions (Phase 1-4)

1. **Review this plan** with team
2. **Understand test isolation strategy** (serial execution + cleanup)
3. **Install Supabase CLI** on development machine
4. **Phase 1: Local Supabase setup** (~1 hour)
   - Initialize and start Supabase
   - Apply Prisma migrations
   - Verify tables created
5. **Phase 2: Dockerfile** (~2 hours)
   - Create Dockerfile with tsc + nodemon
   - Test build locally
   - Verify hot reload
6. **Phase 3: Docker Compose** (~1 hour)
   - Create docker-compose.yml
   - Create smart scripts
   - Test full stack
7. **Phase 4: Testing** (~2 hours)
   - Update .env.test to local
   - Run one test file to verify
   - Run full suite and measure performance
   - Compare before/after times
8. **Document findings** and update this file

### Future Enhancements

1. **Add frontend** to docker-compose when ready
2. **Add CI/CD integration** (GitHub Actions)
3. **Add production Dockerfile** (optimized build)
4. **Explore Sprout** if parallel development needed

---

## References

### Internal Documents

- [DOCKER_TESTING_SETUP.md](./DOCKER_TESTING_SETUP.md) - Inspiration from NIL Marketplace
- [E2E_TESTING_STRATEGY.md](./E2E_TESTING_STRATEGY.md) - Existing test strategy
- [DATA_MODEL_COMPREHENSIVE.md](./DATA_MODEL_COMPREHENSIVE.md) - Database schema

### External Resources

- [Supabase Local Development](https://supabase.com/docs/guides/cli/local-development)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [NestJS Docker Guide](https://docs.nestjs.com/recipes/docker)
- [Sprout CLI](https://github.com/SecDev-Lab/sprout)

---

**Last Updated**: 2025-11-20
**Status**: Ready for Implementation
**Next Review**: After Phase 1-3 completion
