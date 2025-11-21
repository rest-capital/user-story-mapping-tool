# Docker Testing Environment - Setup Guide

**Project**: User Story Mapping Tool
**Created**: 2025-11-20
**Status**: Ready for Implementation
**Time Estimate**: 2-3 hours for full setup

---

## Overview

This guide walks you through setting up the **local Docker-based development environment** with **local Supabase** for the User Story Mapping Tool project.

**What You'll Get:**
- ✅ Local PostgreSQL + Supabase Auth running on your machine
- ✅ Dockerized NestJS backend with hot reload
- ✅ Fast E2E tests (~8-12 seconds, 40-50% faster than cloud)
- ✅ Zero cloud costs for development and testing
- ✅ Offline development capability

**What's Been Created:**
- ✅ `Dockerfile` - Multi-stage build for backend
- ✅ `docker-compose.yml` - Service orchestration
- ✅ `.dockerignore` - Build optimization
- ✅ `apps/backend/.env.local` - Development environment
- ✅ `apps/backend/.env.test.local` - Testing environment
- ✅ `scripts/smart-start.js` - Automated startup
- ✅ `scripts/smart-stop.js` - Automated shutdown

---

## Prerequisites

### Required Software

| Software | Version | Installation |
|----------|---------|--------------|
| **Docker Desktop** | Latest | [Download](https://www.docker.com/products/docker-desktop) |
| **Supabase CLI** | Latest | `brew install supabase/tap/supabase` |
| **Node.js** | 20+ | Already installed (verify: `node --version`) |
| **pnpm** | 8+ | Already installed (verify: `pnpm --version`) |
| **psql** (optional) | 16+ | `brew install postgresql@16` (for verification) |

### Installation Commands

```bash
# 1. Install Supabase CLI
brew install supabase/tap/supabase

# Verify installation
supabase --version

# 2. Ensure Docker Desktop is running
docker --version
docker ps  # Should not error

# 3. (Optional) Install psql for database verification
brew install postgresql@16
```

---

## Phase 1: Local Supabase Setup (30 minutes)

### Step 1.1: Initialize Supabase

```bash
# From project root
cd /Users/blakespencer/code/work/user-story-mapping-tool

# Initialize Supabase (creates supabase/config.toml)
supabase init
```

**Expected Output:**
```
✓ Initialized project at supabase/
```

**Files Created:**
- `supabase/config.toml` - Supabase configuration
- `supabase/.gitignore` - Ignore local state

### Step 1.2: Configure Supabase

The `supabase init` command creates a default `config.toml`. You can keep the defaults, which include:

**Key Configuration** (already in `supabase/config.toml`):
```toml
[api]
enabled = true
port = 54321

[db]
port = 54322

[studio]
enabled = true
port = 54323

[auth]
enabled = true
site_url = "http://localhost:3000"

[auth.email]
enable_signup = true
enable_confirmations = false  # Disable for local dev
```

**Verification:**
```bash
# View config
cat supabase/config.toml
```

### Step 1.3: Start Local Supabase

```bash
# Start all Supabase services
supabase start
```

**Expected Output:**
```
✓ Started supabase local development setup.

API URL: http://localhost:54321
GraphQL URL: http://localhost:54321/graphql/v1
DB URL: postgresql://postgres:postgres@localhost:54322/postgres
Studio URL: http://localhost:54323
Inbucket URL: http://localhost:54324
JWT secret: super-secret-jwt-token-with-at-least-32-characters-long
anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**⚠️ IMPORTANT: Copy the keys!**
- Save `anon key` and `service_role key` - you'll need them in the next step

**First Time?** This will take 2-3 minutes as Supabase pulls Docker images.

### Step 1.4: Update Environment Files with Supabase Keys

Edit `apps/backend/.env.local` and `apps/backend/.env.test.local`:

```bash
# Open .env.local
nano apps/backend/.env.local

# Find these lines and replace with your keys from 'supabase start':
SUPABASE_ANON_KEY="<paste-anon-key-here>"
SUPABASE_SERVICE_ROLE_KEY="<paste-service-role-key-here>"

# Save and exit (Ctrl+X, Y, Enter)

# Do the same for .env.test.local
nano apps/backend/.env.test.local
```

**Or use sed (faster):**
```bash
# Replace placeholder keys in .env.local
sed -i '' "s|SUPABASE_ANON_KEY=\".*\"|SUPABASE_ANON_KEY=\"<your-anon-key>\"|g" apps/backend/.env.local
sed -i '' "s|SUPABASE_SERVICE_ROLE_KEY=\".*\"|SUPABASE_SERVICE_ROLE_KEY=\"<your-service-role-key>\"|g" apps/backend/.env.local

# Replace placeholder keys in .env.test.local
sed -i '' "s|SUPABASE_ANON_KEY=\".*\"|SUPABASE_ANON_KEY=\"<your-anon-key>\"|g" apps/backend/.env.test.local
sed -i '' "s|SUPABASE_SERVICE_ROLE_KEY=\".*\"|SUPABASE_SERVICE_ROLE_KEY=\"<your-service-role-key>\"|g" apps/backend/.env.test.local
```

### Step 1.5: Apply Prisma Migrations to Local Database

```bash
# Navigate to backend
cd apps/backend

# Set environment variables for migration
export DATABASE_URL="postgresql://postgres:postgres@localhost:54322/postgres"
export DIRECT_URL="postgresql://postgres:postgres@localhost:54322/postgres"

# Deploy existing migrations to local database
pnpm prisma migrate deploy

# Generate Prisma client
pnpm prisma generate

# (Optional) Seed database with test data
pnpm prisma db seed
```

**Expected Output:**
```
✓ All migrations applied successfully
✓ Generated Prisma Client to ./node_modules/@prisma/client
```

### Step 1.6: Verify Database Schema

```bash
# Connect to local Supabase database
psql "postgresql://postgres:postgres@localhost:54322/postgres"

# List all tables
\dt

# Expected output:
#  Schema |     Name       | Type  |  Owner
# --------+----------------+-------+----------
#  public | journeys       | table | postgres
#  public | steps          | table | postgres
#  public | releases       | table | postgres
#  public | stories        | table | postgres
#  public | tags           | table | postgres
#  public | personas       | table | postgres
#  public | comments       | table | postgres
#  public | story_links    | table | postgres
#  public | story_tags     | table | postgres
#  public | story_personas | table | postgres
#  public | attachments    | table | postgres

# Exit psql
\q
```

### Step 1.7: Access Supabase Studio (Optional)

```bash
# Open Supabase Studio in browser
open http://localhost:54323
```

**What You Can Do in Studio:**
- Browse database tables
- View and edit data
- Test SQL queries
- Manage auth users
- View logs

---

## Phase 2: Docker Backend Container (30 minutes)

### Step 2.1: Build Docker Image

```bash
# From project root
cd /Users/blakespencer/code/work/user-story-mapping-tool

# Build backend Docker image
docker build --target development -t user-story-mapping-backend:dev .
```

**Expected Output:**
```
[+] Building 45.2s (15/15) FINISHED
 => [internal] load build definition from Dockerfile
 => [development 1/8] FROM node:20-slim
 => [development 5/8] RUN pnpm install --frozen-lockfile
 => [development 6/8] RUN pnpm --filter @user-story-mapping/backend exec prisma generate
 => [development 7/8] RUN pnpm --filter @user-story-mapping/backend build
 => exporting to image
✓ Successfully tagged user-story-mapping-backend:dev
```

**First Time?** This will take 2-3 minutes as it installs dependencies.

### Step 2.2: Test Docker Container (Manual)

```bash
# Run container manually (for testing)
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://postgres:postgres@host.docker.internal:54322/postgres" \
  -e DIRECT_URL="postgresql://postgres:postgres@host.docker.internal:54322/postgres" \
  -e SUPABASE_URL="http://host.docker.internal:54321" \
  -e SUPABASE_ANON_KEY="<your-anon-key>" \
  -e SUPABASE_SERVICE_ROLE_KEY="<your-service-role-key>" \
  user-story-mapping-backend:dev
```

**Expected Output:**
```
[Nest] LOG [NestFactory] Starting Nest application...
[Nest] LOG [InstanceLoader] AppModule dependencies initialized
[Nest] LOG [NestApplication] Nest application successfully started
Listening on port 3000
```

**Verify:**
```bash
# In another terminal
curl http://localhost:3000/api/health
# Expected: {"status":"ok"}

# Stop container
docker ps  # Find container ID
docker stop <container-id>
```

---

## Phase 3: Docker Compose Orchestration (15 minutes)

### Step 3.1: Update Root package.json (Optional)

**⚠️ This requires editing an existing file** - See `docs/DOCKER_IMPLEMENTATION_TODO.md` for details.

For now, you can run commands directly without pnpm scripts.

### Step 3.2: Start Everything with Smart Scripts

```bash
# From project root
node scripts/smart-start.js
```

**What This Does:**
1. ✅ Checks prerequisites (Docker, Supabase CLI)
2. ✅ Starts local Supabase
3. ✅ Builds and starts Docker backend
4. ✅ Displays service URLs and helpful commands

**Expected Output:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🚀 User Story Mapping Tool - Development Environment
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1️⃣  Checking prerequisites...
   ✓ Docker
   ✓ Supabase CLI

2️⃣  Starting Supabase...
   ✓ Started local Supabase

3️⃣  Starting Docker services...
   ✓ Built and started backend

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✅ Development Environment Started!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🌐 Service URLs:
   • Backend API:      http://localhost:3000/api
   • Backend Health:   http://localhost:3000/api/health
   • API Docs (Scalar): http://localhost:3000/api/docs
   • Supabase Studio:  http://localhost:54323
```

### Step 3.3: Verify Services

```bash
# Check backend health
curl http://localhost:3000/api/health
# Expected: {"status":"ok"}

# Check API docs (Scalar UI)
open http://localhost:3000/api/docs

# Check Docker containers
docker compose ps
# Expected: user-story-mapping_backend running

# Check Supabase
supabase status
# Expected: All services "healthy"
```

### Step 3.4: Test Hot Reload

```bash
# Edit a file to trigger hot reload
echo "// Test comment" >> apps/backend/src/main.ts

# Watch Docker logs
docker compose logs -f backend

# Expected: You'll see TypeScript recompiling and nodemon restarting
```

**Clean up test:**
```bash
# Remove test comment
git checkout apps/backend/src/main.ts
```

---

## Phase 4: Testing Environment (30 minutes)

### Step 4.1: Backup Cloud Configuration (Important!)

```bash
# Backup current cloud .env.test
cp apps/backend/.env.test apps/backend/.env.test.cloud.backup

# Verify backup
ls -la apps/backend/.env.test*
```

### Step 4.2: Migrate .env.test to Local Supabase

**⚠️ This requires editing an existing file** - See `docs/DOCKER_IMPLEMENTATION_TODO.md` for details.

**For now, you can test with .env.test.local:**

```bash
# Copy .env.test.local to .env.test (temporary for testing)
cp apps/backend/.env.test.local apps/backend/.env.test.new

# Review the file
cat apps/backend/.env.test.new

# When ready to switch, replace .env.test:
# mv apps/backend/.env.test.new apps/backend/.env.test
```

### Step 4.3: Run E2E Tests

```bash
# From project root
cd apps/backend

# Run all E2E tests
pnpm test:e2e
```

**Expected Output:**
```
PASS test/health.e2e-spec.ts (1.2s)
PASS test/auth.e2e-spec.ts (1.5s)
PASS test/journeys.e2e-spec.ts (1.1s)
PASS test/steps.e2e-spec.ts (1.0s)
PASS test/releases.e2e-spec.ts (1.2s)
PASS test/stories.e2e-spec.ts (1.4s)
PASS test/tags.e2e-spec.ts (0.9s)
PASS test/personas.e2e-spec.ts (1.0s)

Test Suites: 8 passed, 8 total
Tests:       XX passed, XX total
Time:        9.3s (40-50% faster than cloud!)
```

### Step 4.4: Compare Performance

**Before (Cloud Supabase):**
- Test duration: ~15-25 seconds
- Network latency: ~200-500ms per request
- Cost: Accumulates with usage
- Requires internet connection

**After (Local Supabase):**
- Test duration: ~8-12 seconds (40-50% faster!)
- Network latency: <5ms (localhost)
- Cost: $0
- Works offline

### Step 4.5: Run Tests in Docker (Optional)

```bash
# Start Docker backend if not running
node scripts/smart-start.js

# Run tests inside Docker container
docker compose exec backend pnpm test:e2e
```

**When to Use:**
- ✅ To match CI/CD environment exactly
- ✅ To test Docker-specific issues
- ❌ Not for everyday TDD (slower than host)

---

## Common Commands

### Daily Development

```bash
# Start everything
node scripts/smart-start.js

# Stop everything
node scripts/smart-stop.js

# View logs
docker compose logs -f backend

# Restart backend
docker compose restart backend

# Check status
docker compose ps
supabase status

# Run tests
cd apps/backend && pnpm test:e2e
```

### Troubleshooting

```bash
# Supabase won't start
supabase stop
docker system prune -a  # Careful: removes all stopped containers
supabase start

# Backend won't build
docker compose down
docker compose build --no-cache
docker compose up -d

# Database schema out of sync
cd apps/backend
export DATABASE_URL="postgresql://postgres:postgres@localhost:54322/postgres"
pnpm prisma migrate reset --force  # CAUTION: Deletes all data!
pnpm prisma migrate deploy

# View Docker logs
docker compose logs backend
```

---

## Rollback Plan

### Rollback to Cloud Supabase

```bash
# Restore cloud .env.test
cp apps/backend/.env.test.cloud.backup apps/backend/.env.test

# Stop local services
node scripts/smart-stop.js

# Tests will use cloud Supabase again
cd apps/backend
pnpm test:e2e
```

### Remove All Docker Files

```bash
# Stop services first
node scripts/smart-stop.js

# Remove new files (keep documentation)
rm Dockerfile
rm .dockerignore
rm docker-compose.yml
rm -rf scripts/
rm apps/backend/.env.local
rm apps/backend/.env.test.local

# .env.example and docs are safe to keep for reference
```

---

## Success Checklist

After completing this guide, verify:

- [ ] `supabase status` shows all services healthy
- [ ] `docker compose ps` shows backend running
- [ ] `curl http://localhost:3000/api/health` returns `{"status":"ok"}`
- [ ] API docs accessible at `http://localhost:3000/api/docs`
- [ ] Supabase Studio accessible at `http://localhost:54323`
- [ ] Database has all tables (verify with `psql` or Studio)
- [ ] E2E tests pass in ~8-12 seconds
- [ ] Hot reload works when editing `.ts` files
- [ ] `node scripts/smart-start.js` starts everything
- [ ] `node scripts/smart-stop.js` stops everything

---

## Next Steps

### Immediate
1. ✅ Complete this setup guide
2. Test hot reload with code changes
3. Run E2E tests and measure performance
4. Share results with team

### Soon
1. Update root `package.json` with Docker scripts (see `DOCKER_IMPLEMENTATION_TODO.md`)
2. Update `.env.example` with Docker variables (see `DOCKER_IMPLEMENTATION_TODO.md`)
3. Migrate `.env.test` to local Supabase permanently
4. Update documentation in `E2E_TESTING_STRATEGY.md`
5. Delete cloud Supabase test project (save costs!)

### Optional (Phase 5)
1. Install Sprout CLI for parallel development
2. Create sprout-create.sh wrapper script
3. Test multiple worktrees simultaneously

---

## Support

### Documentation
- **Implementation Plan**: `docs/DOCKER_TESTING_IMPLEMENTATION_PLAN.md`
- **Living TODO**: `docs/DOCKER_IMPLEMENTATION_TODO.md`
- **Reference Setup**: `docs/DOCKER_TESTING_SETUP.md` (NIL Marketplace)

### Common Issues

**Issue**: Supabase CLI not found
**Fix**: `brew install supabase/tap/supabase`

**Issue**: Docker daemon not running
**Fix**: Start Docker Desktop

**Issue**: Port already in use
**Fix**: `supabase stop && docker compose down`, then check `lsof -i :3000`

**Issue**: Database migrations fail
**Fix**: Ensure Supabase is running (`supabase status`)

**Issue**: Tests can't connect to database
**Fix**: Verify DATABASE_URL in `.env.test` and Supabase is running

---

**Setup Time**: 2-3 hours for full implementation
**Performance Gain**: 40-50% faster E2E tests
**Cost Savings**: ~$25/month (cloud Supabase test instance)
**Developer Experience**: Offline development + instant feedback

**Happy coding!** 🚀
