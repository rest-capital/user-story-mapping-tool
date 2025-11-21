# Docker Testing Implementation - Living TODO Document

**Created**: 2025-11-20
**Status**: In Progress
**Purpose**: Track required edits to existing files during Docker implementation

---

## Overview

This document tracks all changes that need to be made to EXISTING files. All NEW files are being created directly. This allows for a clean review process before modifying any existing codebase files.

---

## Required Edits to Existing Files

### 1. Root `package.json` - Add Docker Scripts

**File**: `/package.json` (project root)

**Action**: Add new scripts to the `scripts` section

**New Scripts to Add**:
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

**Why**: Provide convenient commands for developers to manage Docker and Supabase

**Priority**: Medium (can run commands directly without scripts initially)

---

### 2. `apps/backend/test/setup.ts` - Add Documentation Header

**File**: `apps/backend/test/setup.ts`

**Action**: Add documentation comment at the top of the file

**Comment to Add**:
```typescript
/**
 * Global test setup for E2E tests
 *
 * ENVIRONMENT:
 * - Uses LOCAL Supabase (via supabase CLI)
 * - Database: localhost:54322
 * - Auth: localhost:54321
 * - Configured via .env.test or .env.test.local
 *
 * CLEANUP STRATEGY:
 * - Cleans database BEFORE each test (not after)
 * - Cleans Supabase Auth users
 * - Ensures test isolation even on failures
 */
```

**Why**: Document the test environment strategy for future developers

**Priority**: Low (documentation only, doesn't affect functionality)

---

### 3. `.env.example` (Root) - Add Docker Compose Variables

**File**: `/.env.example` (project root)

**Action**: Add Docker Compose configuration variables to the end of the file

**Content to Add**:
```bash
# ==============================================================================
# Docker Compose Configuration
# ==============================================================================

# Project name (used as prefix for container names)
COMPOSE_PROJECT_NAME=user-story-mapping

# Backend port mapping (host:container)
# Default: 3000 (matches backend's default port)
BACKEND_PORT=3000

# ==============================================================================
# Sprout Configuration (Optional - For Parallel Development)
# ==============================================================================

# Uncomment these lines if using Sprout for parallel development
# Sprout template syntax uses Jinja2-style variables
# See: https://github.com/SecDev-Lab/sprout

# COMPOSE_PROJECT_NAME=user-story-mapping-{{ branch() }}
# BACKEND_PORT={{ auto_port() }}
# GIT_BRANCH={{ branch() }}
```

**Why**: Provide Docker Compose environment variables for container orchestration

**Priority**: Medium (needed for docker-compose to work properly)

**Note**: Keep existing Supabase and server config as-is, just append Docker section

---

### 4. `docs/E2E_TESTING_STRATEGY.md` - Add Docker Section

**File**: `docs/E2E_TESTING_STRATEGY.md`

**Action**: Add new section after "Database Strategy" section

**Section to Add**: See full content below

**Why**: Document how to run tests locally vs Docker

**Priority**: Low (documentation only)

**Full Content**:
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

---

### 5. `apps/backend/.env.test` - Migrate to Local Supabase

**File**: `apps/backend/.env.test`

**Action**: Update database URLs to point to local Supabase

**⚠️ IMPORTANT**: This file should be edited ONLY after local Supabase is set up and running

**Current** (Cloud Supabase):
```bash
DATABASE_URL="postgresql://postgres.hthsfmaiidjknnvpqgfg:...@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
```

**New** (Local Supabase):
```bash
# Test Environment Configuration
# Uses LOCAL Supabase (start with: supabase start)

# Database Connection
DATABASE_URL="postgresql://postgres:postgres@localhost:54322/postgres"
DIRECT_URL="postgresql://postgres:postgres@localhost:54322/postgres"

# Supabase Configuration
# Get these keys from 'supabase start' output
SUPABASE_URL="http://localhost:54321"
SUPABASE_ANON_KEY="<paste-anon-key-from-supabase-start>"
SUPABASE_SERVICE_ROLE_KEY="<paste-service-role-key-from-supabase-start>"

# Test Configuration
NODE_ENV=test
PORT=3001
API_PREFIX=api
```

**Before Editing**: Create backup file `apps/backend/.env.test.cloud.backup`

**Priority**: HIGH - Required for Phase 4 (Testing Environment)

**Dependencies**:
- Must complete Phase 1 (Local Supabase Setup) first
- Must run `supabase start` to get keys

---

## Implementation Checklist

### Phase 1: Local Supabase Setup (Commands Only)

- [ ] Install Supabase CLI: `brew install supabase/tap/supabase`
- [ ] Initialize Supabase: `supabase init` (creates supabase/config.toml)
- [ ] Configure supabase/config.toml (already created as new file)
- [ ] Start Supabase: `supabase start`
- [ ] Apply Prisma migrations to local DB:
  ```bash
  cd apps/backend
  export DATABASE_URL="postgresql://postgres:postgres@localhost:54322/postgres"
  export DIRECT_URL="postgresql://postgres:postgres@localhost:54322/postgres"
  pnpm prisma migrate deploy
  pnpm prisma generate
  ```
- [ ] Verify tables created: `psql "postgresql://postgres:postgres@localhost:54322/postgres" -c "\dt"`

### Phase 2: Docker Backend Container (New Files)

- [x] Create `Dockerfile` ✅
- [x] Create `.dockerignore` ✅
- [ ] Test Docker build: `docker build --target development -t user-story-mapping-backend:dev .`

### Phase 3: Docker Compose Orchestration (New Files)

- [x] Create `docker-compose.yml` ✅
- [x] Create `.env.example` (root) ✅
- [x] Create `apps/backend/.env.local` ✅
- [x] Create `scripts/smart-start.js` ✅
- [x] Create `scripts/smart-stop.js` ✅
- [ ] Make scripts executable: `chmod +x scripts/*.js`
- [ ] **LATER**: Add Docker scripts to root package.json (see Required Edits #1)

### Phase 4: Testing Environment (Mixed)

- [x] Create `apps/backend/.env.test.local` ✅
- [ ] **LATER**: Backup existing .env.test: `cp apps/backend/.env.test apps/backend/.env.test.cloud.backup`
- [ ] **LATER**: Edit apps/backend/.env.test (see Required Edits #4)
- [ ] Run tests: `cd apps/backend && pnpm test:e2e`
- [ ] Measure performance improvement

### Phase 5: Documentation (New + Edits)

- [ ] **LATER**: Add documentation to test/setup.ts (see Required Edits #2)
- [ ] **LATER**: Add Docker section to E2E_TESTING_STRATEGY.md (see Required Edits #3)

---

## Validation Commands

After implementation, run these commands to verify everything works:

```bash
# 1. Verify Supabase is running
supabase status
# Should show: API URL, DB URL, Studio URL all healthy

# 2. Start Docker services
pnpm local:start
# (Or: node scripts/smart-start.js if package.json not updated yet)

# 3. Check backend health
curl http://localhost:3000/api/health
# Should return: {"status":"ok"}

# 4. View API docs
open http://localhost:3000/api/docs

# 5. Run E2E tests
cd apps/backend
pnpm test:e2e
# Should pass all 8 test files in ~8-12 seconds

# 6. Test hot reload
# Edit apps/backend/src/main.ts
# Watch logs: docker compose logs -f backend
# Should see TypeScript recompiling and nodemon restarting

# 7. Stop everything
pnpm local:stop
# (Or: node scripts/smart-stop.js)
```

---

## Files Created (New Files - Already Done)

✅ All files have been created. See file list at end of document.

---

## Migration Timeline

### Immediate (Can Do Now)

1. ✅ Create all new files (Dockerfile, docker-compose.yml, etc.)
2. Install Supabase CLI
3. Initialize and start local Supabase
4. Test Docker build

### After Testing (Do Later)

1. Update package.json with Docker scripts
2. Update .env.test to use local Supabase
3. Add documentation to setup.ts and E2E_TESTING_STRATEGY.md

---

## Rollback Plan

If anything goes wrong, here's how to roll back:

### Rollback to Cloud Supabase

```bash
# Restore cloud .env.test
cp apps/backend/.env.test.cloud.backup apps/backend/.env.test

# Stop local services
supabase stop
docker compose down

# Tests will use cloud Supabase again
cd apps/backend
pnpm test:e2e
```

### Clean Up New Files

```bash
# If you want to remove everything:
rm Dockerfile
rm .dockerignore
rm docker-compose.yml
rm -rf scripts/
rm apps/backend/.env.local
rm apps/backend/.env.test.local
rm .env.example

# Keep documentation for reference
```

---

## Notes

- All NEW files have been created in this session
- Existing files are untouched and will need manual review before editing
- The .env.test file change is the most critical - backup first!
- Docker scripts in package.json are optional convenience features

---

**Last Updated**: 2025-11-20
**Status**: New files created, existing file edits documented for review
