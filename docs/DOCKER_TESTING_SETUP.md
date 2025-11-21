# Docker Testing Environment - Complete Setup Guide

**Project**: NIL Marketplace (david-franklin)
**Last Updated**: 2025-11-20
**Purpose**: Comprehensive documentation of Docker-based testing infrastructure

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Core Files](#core-files)
4. [Environment Configuration](#environment-configuration)
5. [Testing Types](#testing-types)
6. [Running Tests](#running-tests)
7. [Parallel Testing with Sprout](#parallel-testing-with-sprout)
8. [Troubleshooting](#troubleshooting)

---

## Overview

This project uses **Docker Compose** to orchestrate a complete testing environment with:

- **Backend** (NestJS + GraphQL + Prisma)
- **Frontend** (React + Vite)
- **Inngest** (Background job processing)
- **Supabase** (PostgreSQL database + Auth - runs on host machine)

### Key Features

✅ **Hot Reloading** - Code changes sync automatically
✅ **Isolated Environments** - Parallel development with Sprout
✅ **Complete Test Suite** - Unit, integration, and E2E tests
✅ **Log Rotation** - Automatic 250MB cap per container
✅ **Volume Caching** - Fast rebuilds with pnpm cache mounts

---

## Architecture

### Services Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Host Machine                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Supabase (runs via supabase CLI)                    │   │
│  │  - PostgreSQL: localhost:54322                        │   │
│  │  - Auth API: localhost:54321                          │   │
│  │  - Studio UI: localhost:54323                         │   │
│  └──────────────────────────────────────────────────────┘   │
│                            ▲                                 │
│                            │ (host.docker.internal)          │
│  ┌─────────────────────────┴────────────────────────────┐   │
│  │           Docker Compose Network                      │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │   │
│  │  │   Backend    │  │   Frontend   │  │  Inngest   │ │   │
│  │  │  (NestJS)    │◄─┤   (Vite)     │  │  Dev Server│ │   │
│  │  │              │  │              │  │            │ │   │
│  │  │ Port: 3010   │  │ Port: 5173   │  │ Port: 8288 │ │   │
│  │  └──────────────┘  └──────────────┘  └────────────┘ │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

1. **Supabase on Host**: Runs outside Docker for easier CLI management
2. **host.docker.internal**: Backend connects to Supabase on host machine
3. **Anonymous Volumes**: Prevent node_modules conflicts between host and container
4. **Docker Watch**: Live sync for `src/` directories without rebuilds

---

## Core Files

### 1. `docker-compose.yml`

**Location**: `/docker-compose.yml`
**Purpose**: Orchestrates all services for development

**Key Configuration**:

```yaml
services:
  backend:
    container_name: ${COMPOSE_PROJECT_NAME:-david-franklin}_backend
    build:
      context: .
      dockerfile: Dockerfile
      target: development
    working_dir: /app/apps/backend
    command: pnpm dev
    ports:
      - "${BACKEND_PORT:-3010}:3010"
    volumes:
      - .:/app                              # Sync codebase
      - /app/node_modules                   # Prevent conflicts
      - /app/apps/backend/node_modules      # Prevent conflicts
    logging:
      driver: "json-file"
      options:
        max-size: "50m"                     # Log rotation
        max-file: "5"                       # Keep 5 files
    develop:
      watch:
        - action: sync                      # Hot reload
          path: ./apps/backend/src
          target: /app/apps/backend/src
```

**Important Features**:
- **Log Rotation**: Caps logs at 250MB total (5 × 50MB files)
- **Anonymous Volumes**: Three levels to prevent node_modules sync issues
- **Watch Mode**: Auto-syncs code changes without rebuilds
- **Environment Variables**: Uses `.env` for port configuration

### 2. `Dockerfile`

**Location**: `/Dockerfile`
**Purpose**: Multi-stage build for Node.js applications

```dockerfile
# Base stage - Node.js with pnpm
FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

# Development stage
FROM base AS development
# Install procps for hot reload (provides 'ps' command)
RUN apt-get update && apt-get install -y procps && rm -rf /var/lib/apt/lists/*
COPY . .
# Install with cache mount for faster rebuilds
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile
# Generate Prisma client
RUN pnpm --filter backend exec prisma generate
```

**Key Features**:
- **procps Package**: Required for nodemon/ts-node-dev hot reloading
- **BuildKit Cache**: Persistent pnpm store across builds
- **Multi-stage**: Separates base from development (production stage can be added)
- **Prisma Generation**: Ensures client is ready before app starts

### 3. `.dockerignore`

**Location**: `/.dockerignore`
**Purpose**: Excludes unnecessary files from Docker context

**Critical Exclusions**:
```
node_modules              # Installed inside container
dist                      # Built inside container
.env                      # Never copy secrets
.env.*                    # Except .env.example
coverage                  # Test outputs
.git                      # Not needed in container
```

### 4. `.env.example`

**Location**: `/.env.example`
**Purpose**: Sprout template for auto-generating isolated environments

```bash
# Sprout template syntax
COMPOSE_PROJECT_NAME=david-franklin-{{ branch() }}
BACKEND_PORT={{ auto_port() }}
WEB_PORT={{ auto_port() }}
INNGEST_PORT={{ auto_port() }}
GIT_BRANCH={{ branch() }}
```

**How It Works**:
- Sprout reads this template
- Replaces `{{ branch() }}` with sanitized branch name
- Replaces `{{ auto_port() }}` with unique port numbers
- Generates `.env` in each worktree

**Example Output** (`.sprout/feature/auth/.env`):
```bash
COMPOSE_PROJECT_NAME=david-franklin-feature-auth
BACKEND_PORT=40123
WEB_PORT=40124
INNGEST_PORT=40125
GIT_BRANCH=feature-auth
```

### 5. Backend Environment (`.env.local`)

**Location**: `/apps/backend/.env.local` (gitignored)
**Template**: `/apps/backend/.env.example`

**Critical Settings for Docker**:
```bash
# ✅ CORRECT - Use host.docker.internal for Supabase on host
DATABASE_URL="postgresql://postgres:postgres@host.docker.internal:54322/postgres"
SUPABASE_URL="http://host.docker.internal:54321"

# ✅ CORRECT - Use Docker service name for Inngest
INNGEST_BASE_URL="http://inngest:8288"

# Backend PORT - Optional (defaults to 3010 if not set)
PORT="3010"
# Note: The .env.example shows PORT="3000" but the app defaults to 3010
# Docker Compose maps to 3010, so keep this at 3010 for consistency

# ❌ WRONG - Don't use localhost (won't work inside Docker)
# DATABASE_URL="postgresql://postgres:postgres@localhost:54322/postgres"
```

**Port Configuration Note**:
The backend application (`apps/backend/src/main.ts`) uses:
```typescript
const port = process.env.PORT ?? 3010;
```
So if `PORT` is not set, it defaults to **3010**. The `docker-compose.yml` maps host port 3010 to container port 3010, ensuring consistency.

---

## Environment Configuration

### Development Setup (First Time)

```bash
# 1. Install Sprout CLI (one-time, optional - only needed for parallel development)
brew install pipx
pipx install git+https://github.com/SecDev-Lab/sprout.git

# 2. Create environment files
cp apps/backend/.env.example apps/backend/.env.local
cp apps/web/.env.example apps/web/.env.local

# 3. Start everything (Supabase + Docker) - Smart script handles it all!
pnpm local:start
# This script:
# - Starts Supabase on host machine
# - Shows credentials to copy
# - Starts Docker services

# 4. Update .env.local files with Supabase credentials from output
# Important: Use host.docker.internal for DATABASE_URL and SUPABASE_URL

# 5. Run migrations and seed data
pnpm docker:migrate
pnpm docker:seed
```

**Note**: The `pnpm local:start` script (smart-start.js) automatically:
- Detects if you're in main directory or Sprout worktree
- Starts Supabase (main directory only)
- Starts Docker with appropriate configuration
- Shows you the service URLs and ports

### Docker Networking Rules

**Inside Docker Containers** (backend talking to other services):
- ✅ Use Docker service names: `http://inngest:8288`
- ✅ Use host.docker.internal for host services: `host.docker.internal:54322`
- ❌ Don't use localhost or 127.0.0.1

**Outside Docker** (browser, Postman):
- ✅ Use localhost with mapped ports: `http://localhost:3010/graphql`
- ✅ Check `.env` for assigned ports in Sprout worktrees

---

## Testing Types

### 1. Unit Tests

**Location**: `apps/backend/src/**/*.spec.ts`
**Runner**: Jest
**Environment**: No Docker required (mocked dependencies)

```bash
# Run all unit tests
pnpm test

# Run unit tests only (exclude integration)
pnpm --filter backend test:unit

# Watch mode
pnpm --filter backend test:watch
```

**Example**: `apps/backend/src/auth/auth.service.spec.ts`

### 2. Integration Tests

**Location**: `apps/backend/src/**/*.integration.spec.ts`
**Runner**: Jest
**Environment**: Requires database connection

```bash
# Run integration tests
pnpm --filter backend test:integration
```

**Setup**:
- Connects to real database (test instance)
- Creates/destroys test data in transactions
- Timeout: 30 seconds per test

### 3. E2E Tests

**Location**: `apps/backend/test/**/*.e2e-spec.ts`
**Runner**: Jest with supertest
**Environment**: Full application + database

```bash
# Run E2E tests
pnpm --filter backend test:e2e

# Or inside Docker container
docker compose exec backend pnpm test:e2e
```

**Test Files**:
- `app.e2e-spec.ts` - Basic health check
- `auth-integration.e2e-spec.ts` - Full auth flow with cookies
- `auth-rate-limiting.e2e-spec.ts` - Rate limiting validation
- `token-refresh.e2e-spec.ts` - JWT refresh flow

**Configuration**: `apps/backend/test/jest-e2e.json`
```json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": ".",
  "testEnvironment": "node",
  "testRegex": ".e2e-spec.ts$",
  "transform": {
    "^.+\\.(t|j)s$": "ts-jest"
  }
}
```

**Important: Database Usage**
- ⚠️ E2E tests use the **same database** as your development environment
- Tests clean up their own data in `beforeAll` and `afterAll` hooks
- No separate test database is configured
- **Best Practice**: Run tests against a local Supabase instance, not production!

**Example Test Setup**:
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/shared/prisma/prisma.service';

describe('Auth E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    // Create test application
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());  // Required for cookie tests
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });
});
```

---

## Running Tests

### Quick Commands

```bash
# Start everything (Supabase + Docker) - RECOMMENDED
pnpm local:start
# Uses scripts/smart-start.js - detects main vs worktree, starts appropriate services

# Stop everything (Docker + Supabase)
pnpm local:stop
# Uses scripts/smart-stop.js

# Fast restart (no Supabase restart) - FASTEST for code changes
pnpm local:restart
# Uses scripts/smart-restart.js - only restarts Docker containers

# Just Docker (Supabase already running)
pnpm docker:dev

# View logs
pnpm docker:logs

# Run tests inside Docker
docker compose exec backend pnpm test
docker compose exec backend pnpm test:e2e

# Run tests on host (faster for TDD)
cd apps/backend
pnpm test:watch
```

**Smart Scripts Behavior**:
- `pnpm local:start` - Detects environment:
  - **Main directory**: Starts Supabase + Docker
  - **Sprout worktree**: Starts Docker only (Supabase runs in main)
- `pnpm local:restart` - Fast restart without Supabase (saves ~30 seconds)
- `pnpm local:stop` - Stops everything cleanly

### Test Workflows

#### 1. TDD Workflow (Fastest)

```bash
# Terminal 1: Run services
pnpm docker:dev

# Terminal 2: Watch tests on HOST machine
cd apps/backend
pnpm test:watch
```

**Pros**: Fastest test feedback loop
**Cons**: Uses host node_modules (ensure `pnpm install` is up-to-date)

#### 2. Full Docker Testing

```bash
# Run services
pnpm docker:dev

# Run tests inside container
docker compose exec backend pnpm test:e2e
```

**Pros**: Matches CI/CD environment exactly
**Cons**: Slower (needs to enter container)

#### 3. CI/CD Simulation

```bash
# Clean slate
pnpm local:clean:nuclear

# Fresh build
pnpm docker:build

# Run all tests
docker compose exec backend pnpm test
docker compose exec backend pnpm test:integration
docker compose exec backend pnpm test:e2e
```

**Use When**: Debugging CI failures locally

---

## Parallel Testing with Sprout

### Why Sprout?

**Problem**: Multiple developers/agents can't run `docker compose up` simultaneously (port conflicts)

**Solution**: Sprout creates isolated git worktrees with unique ports for each branch

### Creating Isolated Environments

#### Automated (Recommended)

```bash
# Interactive workflow
pnpm sprout:new

# Follow prompts:
# 1. Enter branch name (e.g., feature/my-feature)
# 2. Confirm Docker start
# 3. Get assigned ports
```

#### Manual

```bash
# Create worktree with auto-assigned ports
./sprout-create.sh feature/my-feature

# Navigate to worktree
cd .sprout/feature/my-feature

# Set up environment
cp apps/backend/.env.example apps/backend/.env.local
cp apps/web/.env.example apps/web/.env.local

# Start services (unique ports!)
docker compose up -d

# Check assigned ports
cat .env
```

**Output Example**:
```
✅ Workspace 'feature/my-feature' is ready!

Generated configuration:
COMPOSE_PROJECT_NAME=david-franklin-feature-my-feature
BACKEND_PORT=61731
WEB_PORT=42747
INNGEST_PORT=57092

Access your services:
- Backend: http://localhost:61731/graphql
- Frontend: http://localhost:42747
- Inngest: http://localhost:57092
```

### Complete Isolation

Each worktree gets:
- ✅ Unique ports (no conflicts)
- ✅ Isolated Docker containers
- ✅ Separate Docker networks
- ✅ Independent volumes
- ✅ Own database instance

**Container Names**:
```
Main:     david-franklin_backend
Worktree: david-franklin-feature-my-feature_backend
```

### Cleanup

```bash
# From worktree directory
docker compose down -v
cd ../..

# Remove worktree
pnpm sprout:remove feature/my-feature

# Or manually
~/.local/bin/sprout rm feature/my-feature
```

### Best Practices

1. **Use wrapper script**: `./sprout-create.sh` (handles slash sanitization)
2. **Clean up when done**: Remove worktrees after merging
3. **Check ports first**: `cat .env | grep PORT`
4. **List active worktrees**: `pnpm sprout:list`

---

## Troubleshooting

### Port Already in Use

```bash
# Check what's using the port
lsof -i :3010

# Stop all Docker services
pnpm local:stop

# Or kill specific container
docker compose down
```

### Hot Reload Not Working

```bash
# Rebuild with procps package
pnpm docker:build
pnpm docker:dev
```

**Root Cause**: Missing `procps` package (provides `ps` command for nodemon)

### Database Connection Fails

**Error**: `Can't reach database server at localhost:54322`

**Fix**: Use `host.docker.internal` instead of `localhost` in `.env.local`

```bash
# ✅ CORRECT
DATABASE_URL="postgresql://postgres:postgres@host.docker.internal:54322/postgres"

# ❌ WRONG
DATABASE_URL="postgresql://postgres:postgres@localhost:54322/postgres"
```

### Test Database Conflicts

**Issue**: E2E tests fail with "relation already exists"

**Fix**: Use isolated database for tests

```bash
# Option 1: Reset database
supabase db reset

# Option 2: Use transactions in tests (recommended)
beforeEach(async () => {
  await prisma.$transaction([
    // Clean up test data
  ]);
});
```

### No Space Left on Device

**Cause**: Docker bloat (images, containers, build cache)

```bash
# Check disk usage
docker system df

# Surgical cleanup (recommended)
pnpm local:clean

# Nuclear option (removes ALL Docker data)
pnpm local:clean:nuclear
```

**Prevention**: Log rotation is configured (250MB cap per container)

### Services Can't Talk to Each Other

**Inside Docker**:
- ✅ Use service names: `http://backend:3010`
- ❌ Don't use: `http://localhost:3010`

**Outside Docker** (browser):
- ✅ Use localhost: `http://localhost:3010`
- ❌ Don't use: `http://backend:3010`

### Stale node_modules

**Symptoms**: Module not found errors after adding dependencies

**Fix**:
```bash
# Rebuild containers
pnpm docker:build

# Or clear volumes and rebuild
docker compose down -v
pnpm docker:build
pnpm docker:dev
```

---

## Advanced Topics

### Running Specific Test Suites

```bash
# Single file
docker compose exec backend pnpm test -- auth.service.spec.ts

# Pattern matching
docker compose exec backend pnpm test -- --testPathPattern=auth

# With coverage
docker compose exec backend pnpm test:cov
```

### Debug Mode

```bash
# Enable debug logging
NODE_ENV=development pnpm docker:dev

# Debug tests with inspector
docker compose exec backend pnpm test:debug
```

### Custom Test Database

**Edit**: `apps/backend/.env.local`

```bash
# Separate test database
DATABASE_URL="postgresql://postgres:postgres@host.docker.internal:54322/test_db"
```

**Create database**:
```bash
# Inside Supabase
supabase db reset --db-url "postgresql://postgres:postgres@localhost:54322/test_db"
```

---

## File Reference

### Complete File List

```
Project Root
├── docker-compose.yml           # Service orchestration
├── Dockerfile                    # Node.js container definition
├── .dockerignore                 # Exclude files from context
├── .env.example                  # Sprout template
├── sprout-create.sh              # Worktree creation wrapper
│
├── apps/backend/
│   ├── .env.example              # Backend config template
│   ├── .env.local               # (gitignored) Your config
│   ├── package.json              # Test scripts
│   ├── test/
│   │   ├── jest-e2e.json         # E2E test config
│   │   ├── app.e2e-spec.ts       # Health check test
│   │   ├── auth-integration.e2e-spec.ts
│   │   ├── auth-rate-limiting.e2e-spec.ts
│   │   └── token-refresh.e2e-spec.ts
│   └── src/**/*.spec.ts          # Unit tests
│
├── docs/
│   ├── API_CONTRACT_TESTING.md   # Testing strategy
│   ├── DOCKER_MAINTENANCE.md     # Cleanup guide
│   ├── PARALLEL_DEVELOPMENT.md   # Sprout guide
│   └── DOCKER_TESTING_SETUP.md   # This file
│
└── scripts/
    ├── smart-start.js            # pnpm local:start
    ├── smart-stop.js             # pnpm local:stop
    ├── smart-restart.js          # pnpm local:restart
    ├── sprout-workflow.js        # pnpm sprout:new
    ├── sprout-cleanup.js         # pnpm sprout:remove
    └── sprout-cleanup-all.js     # Clean all worktrees
```

---

## Quick Reference

### Essential Commands

| Command | Purpose |
|---------|---------|
| `pnpm local:start` | Start Supabase + Docker |
| `pnpm local:stop` | Stop everything |
| `pnpm local:restart` | Fast restart (no Supabase) |
| `pnpm docker:dev` | Start Docker only |
| `pnpm docker:logs` | View logs |
| `pnpm docker:build` | Rebuild containers |
| `pnpm sprout:new` | Create isolated worktree |
| `docker compose exec backend pnpm test` | Run tests in container |

### Port Defaults

| Service | Default Port | Environment Variable |
|---------|--------------|---------------------|
| Backend | 3010 | `BACKEND_PORT` |
| Frontend | 5173 | `WEB_PORT` |
| Inngest | 8288 | `INNGEST_PORT` |
| Supabase DB | 54322 | N/A (host machine) |
| Supabase API | 54321 | N/A (host machine) |

### Health Checks

```bash
# Check all services are running
docker compose ps

# Test backend
curl http://localhost:3010/graphql

# Test frontend
curl http://localhost:5173

# Check Supabase
supabase status

# View disk usage
docker system df
```

---

## Related Documentation

- [API Contract Testing Strategy](./API_CONTRACT_TESTING.md)
- [Docker Maintenance Guide](../DOCKER_MAINTENANCE.md)
- [Parallel Development with Sprout](./PARALLEL_DEVELOPMENT.md)
- [System Architecture](./SYSTEM_ARCHITECTURE.md)

---

## Verification Log

This documentation has been verified against the actual codebase on **2025-11-20**:

### Verified Components

| Component | File(s) Checked | Status |
|-----------|----------------|--------|
| **Supabase Configuration** | `supabase/config.toml`, `scripts/smart-start.js` | ✅ Runs on host machine, ports 54321/54322/54323 confirmed |
| **Backend Port** | `apps/backend/src/main.ts`, `docker-compose.yml` | ✅ Defaults to 3010, Docker maps correctly |
| **Docker Compose** | `docker-compose.yml` | ✅ All services, ports, volumes, logging verified |
| **Dockerfile** | `Dockerfile` | ✅ Multi-stage build, procps package, cache mounts confirmed |
| **Test Setup** | `apps/backend/test/*.e2e-spec.ts` | ✅ Uses same DB as dev, cleanup hooks verified |
| **Environment Files** | `.env.example`, `apps/backend/.env.example` | ✅ Sprout templates and Docker networking confirmed |
| **Smart Scripts** | `scripts/smart-start.js`, `smart-stop.js`, `smart-restart.js` | ✅ Auto-detection logic verified |
| **Sprout Integration** | `sprout-create.sh`, `.env.example` | ✅ Auto-port assignment and isolation verified |

### Known Quirks

1. **Backend PORT**: `.env.example` shows `PORT="3000"` but app defaults to 3010 if not set. Recommendation: Set to 3010 for clarity.
2. **Test Database**: No separate test DB - tests use development database with cleanup hooks. Consider this when running tests.
3. **Supabase Location**: Must run on host machine (not in Docker) for this setup. Docker services connect via `host.docker.internal`.

---

**Last Updated**: 2025-11-20
**Verified By**: AI Agent (against source code)
**Maintainer**: Development Team
**Questions?**: Check troubleshooting section or review related docs
