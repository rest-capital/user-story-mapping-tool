# User Story Mapping Tool

A collaborative user story mapping tool built with NestJS, PostgreSQL (Supabase), and TypeScript.

## Table of Contents

- [Prerequisites](#prerequisites)
- [First Time Setup](#first-time-setup)
- [Daily Workflow](#daily-workflow)
- [Git Worktree Workflow](#git-worktree-workflow)
- [Testing Workflow](#testing-workflow)
- [Project Structure](#project-structure)
- [Available Scripts](#available-scripts)
- [Documentation](#documentation)
- [Tech Stack](#tech-stack)

---

## Prerequisites

- **Node.js** >= 18.0.0
- **pnpm** >= 8.0.0
- **Docker Desktop** (for containerized backend)
- **Supabase CLI** (for local database)

### Install Prerequisites

```bash
# Install Node.js via nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18

# Install pnpm
npm install -g pnpm

# Install Supabase CLI
brew install supabase/tap/supabase

# Verify Docker is installed
docker --version
```

---

## First Time Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd user-story-mapping-tool
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Set Up Local Supabase

```bash
# Initialize and start local Supabase
supabase start

# This will:
# - Start PostgreSQL on localhost:54322
# - Start Supabase Studio on http://localhost:54323
# - Display your local API keys (save these!)
```

**Copy the output keys** - you'll need them for environment configuration.

### 4. Configure Environment

Create `apps/backend/.env.local` with your local Supabase credentials:

```bash
# Create the file
cat > apps/backend/.env.local << 'EOF'
# Local Development Environment
# Uses local Supabase (from 'supabase start')

# Database Connection (Local Supabase PostgreSQL)
DATABASE_URL="postgresql://postgres:postgres@localhost:54322/postgres"
DIRECT_URL="postgresql://postgres:postgres@localhost:54322/postgres"

# Supabase Configuration (Local)
# Get these keys from 'supabase start' output
SUPABASE_URL="http://localhost:54321"
SUPABASE_ANON_KEY="<paste-anon-key-from-supabase-start>"
SUPABASE_SERVICE_ROLE_KEY="<paste-service-role-key-from-supabase-start>"

# Server Configuration
NODE_ENV=development
PORT=3000
API_PREFIX=api
EOF

# Now edit the file and replace the placeholder keys with actual keys from 'supabase start'
```

**Important**: Copy the `anon key` and `service_role key` from the `supabase start` output and paste them into the file above.

### 5. Run Database Migrations

```bash
cd apps/backend
npx prisma migrate dev
npx prisma generate
cd ../..
```

### 6. Start the Application

```bash
# Start both Supabase and Docker services
pnpm local:start

# This smart script will:
# - Start Supabase (if in main repo)
# - Start Docker backend
# - Display service URLs
```

### 7. Verify Setup

Open these URLs in your browser:
- **Backend API**: http://localhost:3000/api/health
- **API Docs**: http://localhost:3000/api/docs (Scalar UI)
- **Supabase Studio**: http://localhost:54323

You should see:
```json
{
  "status": "ok",
  "message": "User Story Mapping Service is running"
}
```

---

## Daily Workflow

### Starting Your Work Session

```bash
# 1. Start services (Supabase + Docker backend)
pnpm local:start

# 2. Check service status
docker compose ps
supabase status

# 3. Open your editor
code .
```

### Making Changes

```bash
# Backend code changes auto-reload via Docker volumes
# Just edit files in apps/backend/src/ and save

# View logs
pnpm docker:logs

# Restart backend only (fast - no Supabase restart)
pnpm local:restart
```

### Running Tests

```bash
# Run E2E tests (uses local Supabase)
cd apps/backend
pnpm test:e2e

# Run specific test file
pnpm test:e2e -- auth.e2e-spec.ts

# Run tests in watch mode
pnpm test:e2e -- --watch
```

### Ending Your Work Session

```bash
# Stop all services
pnpm local:stop

# This stops:
# - Docker containers
# - Supabase (if in main repo)
```

### Database Management

```bash
# Create a new migration
cd apps/backend
npx prisma migrate dev --name add_new_feature

# View database in Supabase Studio
# Visit: http://localhost:54323

# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Seed database (if seed script exists)
npx prisma db seed
```

---

## Git Worktree Workflow

**Use worktrees to work on multiple features simultaneously** without branch switching or port conflicts.

### What Are Worktrees?

Git worktrees let you have multiple working directories from the same repository. Each worktree:
- Has its own branch
- Has its own Docker containers with unique ports
- Shares the same Supabase instance (running in main repo)

### First-Time Worktree Setup

**Run this once** to convert your repository to bare repository structure:

```bash
pnpm worktree:setup

# This will:
# 1. Convert current repo to bare repository at ~/repos/user-story-mapping-tool.bare
# 2. Create main worktree at ~/code/user-story-mapping-tool/main
# 3. Copy your .env and settings
```

### Creating a New Worktree

```bash
# From anywhere in your repo
pnpm worktree:create <ticket-id> <branch-name>

# Example:
pnpm worktree:create ENG-123 feature/user-authentication

# This creates:
# - New directory: ~/code/user-story-mapping-tool/ENG-123
# - New branch: feature/user-authentication
# - Unique .env with auto-assigned ports
# - Ready-to-use environment
```

### Working in a Worktree

```bash
# Navigate to your worktree
cd ~/code/user-story-mapping-tool/ENG-123

# Install dependencies (if needed)
pnpm install

# Start services (Docker only - Supabase runs in main)
pnpm local:start

# Your backend runs on a unique port (e.g., 47832)
# Check .env to see your assigned ports

# Work normally
code .
git status
git add .
git commit -m "Implement feature"
git push origin feature/user-authentication
```

### Managing Multiple Worktrees

```bash
# List all worktrees
pnpm worktree:list

# Example output:
# main        → main                         (active)
# ENG-123     → feature/user-authentication  (port: 47832)
# ENG-124     → feature/email-notifications  (port: 51294)

# Switch between worktrees
cd ~/code/user-story-mapping-tool/ENG-123
cd ~/code/user-story-mapping-tool/ENG-124

# Each has its own:
# - Git branch
# - Docker containers
# - Backend port
# - Changes isolated
```

### Parallel Development Example

```bash
# Terminal 1: Work on feature A
cd ~/code/user-story-mapping-tool/ENG-123
pnpm local:start  # Backend on port 47832

# Terminal 2: Work on feature B simultaneously
cd ~/code/user-story-mapping-tool/ENG-124
pnpm local:start  # Backend on port 51294

# Both run at the same time!
# Both share same Supabase (no database conflicts)
# Ideal for AI agent workflows
```

### Cleaning Up a Worktree

```bash
# When feature is merged, clean up
pnpm worktree:cleanup <ticket-id>

# Example:
pnpm worktree:cleanup ENG-123

# This removes:
# - Git worktree
# - Directory
# - Docker containers
# - Docker volumes
# - Docker networks
```

### Advanced Worktree Commands

```bash
# Refresh worktree (git pull + pnpm install)
pnpm worktree:refresh

# Clean up ALL worktrees (nuclear option)
pnpm worktree:cleanup-all

# Remove just git worktree (no Docker cleanup)
pnpm worktree:remove <worktree-path>
```

### Worktree Best Practices

1. **Always use main for Supabase**: Only run `supabase start` in the main worktree
2. **Unique branches**: Each worktree should have its own feature branch
3. **Clean up regularly**: Remove merged worktrees to save disk space
4. **Check ports**: If port conflicts occur, check `.env` and restart Docker
5. **Shared database**: All worktrees share Supabase, so schema changes affect everyone

---

## Testing Workflow

### E2E Testing Architecture

Our E2E tests use:
- **Local Supabase** (not cloud) for complete control
- **Parallel execution** (Jest workers scale with CPU cores)
- **Worker-specific databases** (test_db_1, test_db_2, ...) for isolation
- **Factory pattern** for test data creation
- **Automatic cleanup** before each test

### Running E2E Tests

```bash
# 1. Ensure Supabase is running
supabase status

# 2. Set up test databases (FIRST TIME ONLY)
cd apps/backend
pnpm test:setup
# This creates test_db_1, test_db_2, test_db_3, test_db_4, etc.

# 3. Run all E2E tests
pnpm test:e2e

# Tests run in parallel with ~50% of CPU cores
# Example: 8-core system = 4 parallel workers
```

### Running Specific Tests

```bash
# Single test file
pnpm test:e2e -- journeys.e2e-spec.ts

# Test pattern matching
pnpm test:e2e -- --testNamePattern="should create journey"

# Specific test suite
pnpm test:e2e -- cascade-deletes.e2e-spec.ts

# Watch mode (re-runs on file changes)
pnpm test:e2e -- --watch
```

### Test Debugging

```bash
# Run tests sequentially (easier debugging)
pnpm test:e2e -- --runInBand

# Verbose output
pnpm test:e2e -- --verbose

# See console.log statements
pnpm test:e2e -- --silent=false
```

### Understanding Parallel Test Execution

```
Main Process (Jest)
├── Worker 1 → test_db_1 (runs auth.e2e-spec.ts)
├── Worker 2 → test_db_2 (runs journeys.e2e-spec.ts)
├── Worker 3 → test_db_3 (runs releases.e2e-spec.ts)
└── Worker 4 → test_db_4 (runs cascade-deletes.e2e-spec.ts)

Each worker:
- Has isolated database (perfect isolation)
- Shares same Supabase Auth (imperfect - use unique emails)
- Runs tests sequentially within the worker
- Cleans database before each test
```

### Test Database Setup

E2E tests use worker-specific databases that must be created first:

```bash
# Create test databases (run once before first test)
cd apps/backend
pnpm test:setup

# This creates: test_db_1, test_db_2, test_db_3, test_db_4, etc.
# One database per Jest worker for perfect isolation

# View databases in Supabase Studio
# Visit: http://localhost:54323
# You'll see all test_db_* databases listed
```

### Writing New E2E Tests

Follow the factory pattern:

```typescript
// apps/backend/test/my-feature.e2e-spec.ts
import { createTestApp } from './helpers/test-app';
import { createAuthToken } from './helpers/auth';
import { createJourney, createStep } from './factories';

describe('My Feature (E2E)', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    authToken = await createAuthToken(app);
  });

  afterAll(async () => {
    await app.close();
  });

  it('should do something', async () => {
    // Use factories for test data
    const journey = await createJourney(app, authToken, 'Test Journey');
    const step = await createStep(app, authToken, journey.id, 'Test Step');

    // Test your feature
    const response = await request(app.getHttpServer())
      .get(`/api/journeys/${journey.id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body.name).toBe('Test Journey');
  });
});
```

### Test Coverage

```bash
# Generate coverage report
pnpm test:e2e -- --coverage

# View coverage in browser
open apps/backend/coverage/lcov-report/index.html
```

### Troubleshooting Tests

**Tests hang or timeout:**
```bash
# Increase timeout in jest-e2e.json
"testTimeout": 60000  // 60 seconds

# Or use forceExit (already enabled)
"forceExit": true
```

**Database not resetting:**
```bash
# Check setup.ts is configured in jest-e2e.json
"setupFilesAfterEnv": ["<rootDir>/setup.ts"]

# Manually reset if needed
npx prisma migrate reset
```

**Port already in use:**
```bash
# Kill processes using port 3001 (test port)
lsof -ti:3001 | xargs kill -9

# Or change PORT in .env.test
PORT=3002
```

**Supabase not running:**
```bash
# Start Supabase
supabase start

# Check status
supabase status

# Should show: API URL: http://localhost:54321
```

---

## Project Structure

```
user-story-mapping-tool/
├── apps/
│   └── backend/                    # NestJS Backend API
│       ├── src/
│       │   ├── modules/            # Feature modules (domain-driven)
│       │   │   ├── auth/          # Authentication (Supabase)
│       │   │   ├── journeys/      # Journey management
│       │   │   ├── steps/         # Step management
│       │   │   ├── releases/      # Release management
│       │   │   ├── stories/       # Story management
│       │   │   ├── story-links/   # Story dependencies
│       │   │   ├── comments/      # Comments
│       │   │   ├── tags/          # Tags
│       │   │   ├── personas/      # Personas
│       │   │   ├── health/        # Health check
│       │   │   ├── prisma/        # Prisma service
│       │   │   └── supabase/      # Supabase client
│       │   ├── common/            # Cross-cutting concerns
│       │   │   ├── filters/       # Exception filters
│       │   │   ├── guards/        # Auth guards
│       │   │   ├── interceptors/  # HTTP interceptors
│       │   │   └── base.service.ts # Base service class
│       │   ├── generated/         # Generated DTOs (Prisma)
│       │   ├── config/            # Configuration
│       │   ├── app.module.ts      # Root module
│       │   └── main.ts            # Entry point
│       ├── test/                  # E2E Tests
│       │   ├── factories/         # Test data factories
│       │   ├── fixtures/          # Test fixtures
│       │   ├── helpers/           # Test helpers
│       │   ├── *.e2e-spec.ts      # E2E test files
│       │   ├── jest-e2e.json      # Jest config
│       │   └── setup.ts           # Global test setup
│       ├── prisma/
│       │   └── schema.prisma      # Database schema
│       ├── scripts/               # Utility scripts
│       ├── .env.example           # Environment template
│       ├── .env.local             # Local environment (gitignored)
│       └── .env.test              # Test environment
├── scripts/                       # Root-level scripts
│   ├── smart-start.js            # Worktree-aware start
│   ├── smart-stop.js             # Worktree-aware stop
│   ├── smart-restart.js          # Fast restart
│   └── worktree-*.js             # Worktree management
├── hack/                         # Setup scripts
│   ├── setup_bare_repository.sh  # Worktree setup
│   ├── create_worktree.sh        # Create worktree
│   └── worktree-*.sh             # Worktree utilities
├── docs/                         # Documentation
│   ├── DOCKER_TESTING_IMPLEMENTATION_PLAN.md
│   ├── E2E_TESTING_STRATEGY.md
│   ├── DATA_MODEL_COMPREHENSIVE.md
│   └── ...
├── docker-compose.yml            # Docker orchestration
├── Dockerfile                    # Backend Docker image
├── .env.example                  # Root environment template
├── CLAUDE.md                     # Backend guide for Claude
└── package.json                  # Root workspace config
```

### Architecture Highlights

- **Feature-based modules**: Code organized by domain (NestJS best practice)
- **Monorepo**: pnpm workspaces for multiple apps
- **Docker + Supabase**: Docker for backend, Supabase on host (shared)
- **Worktree-ready**: Parallel development with isolated environments
- **Test isolation**: Worker-specific databases for parallel E2E tests

---

## Available Scripts

### Local Development

```bash
pnpm local:start          # Start Supabase + Docker (worktree-aware)
pnpm local:stop           # Stop Docker + Supabase (worktree-aware)
pnpm local:restart        # Fast restart (Docker only, saves ~30s)
```

### Docker Management

```bash
pnpm docker:up            # Start Docker services
pnpm docker:down          # Stop Docker services
pnpm docker:build         # Rebuild Docker images
pnpm docker:logs          # Follow Docker logs
pnpm docker:restart       # Restart Docker services
pnpm docker:clean         # Clean Docker resources (normal)
pnpm docker:clean:full    # Nuclear cleanup (removes volumes)
pnpm docker:status        # Show Docker status + disk usage
```

### Supabase Management

```bash
supabase start            # Start local Supabase
supabase stop             # Stop local Supabase
supabase status           # Show Supabase status + URLs
supabase db reset         # Reset database (WARNING: deletes data)
```

### Git Worktree Management

```bash
pnpm worktree:setup       # One-time setup (converts to bare repo)
pnpm worktree:create      # Create new worktree
pnpm worktree:list        # List all worktrees
pnpm worktree:cleanup     # Remove worktree + Docker resources
pnpm worktree:cleanup-all # Remove all worktrees (nuclear)
pnpm worktree:refresh     # Update worktree (git pull + pnpm install)
pnpm worktree:remove      # Remove worktree (no Docker cleanup)
```

### Build & Test

```bash
pnpm build                # Build backend
pnpm dev                  # Start backend in watch mode
pnpm test                 # Run all tests
pnpm test:e2e             # Run E2E tests (in apps/backend)
pnpm lint                 # Lint all code
pnpm format               # Format code with Prettier
pnpm clean                # Clean build artifacts
```

### Backend-Specific (from apps/backend/)

```bash
pnpm dev                  # Start with hot reload
pnpm build                # Build TypeScript
pnpm start                # Start production build
pnpm test:e2e             # Run E2E tests
pnpm test:e2e -- --watch  # E2E tests in watch mode
npx prisma migrate dev    # Create database migration
npx prisma generate       # Generate Prisma client
npx prisma studio         # Open Prisma Studio
```

---

## API Endpoints

Once running, the API is available at:

- **Health Check**: http://localhost:3000/api/health
- **API Documentation**: http://localhost:3000/api/docs (Scalar UI)
- **Supabase Studio**: http://localhost:54323

### Example API Usage

```bash
# Health check
curl http://localhost:3000/api/health

# Get all journeys (requires auth)
curl http://localhost:3000/api/journeys \
  -H "Authorization: Bearer <your-jwt-token>"

# Create a journey (requires auth)
curl -X POST http://localhost:3000/api/journeys \
  -H "Authorization: Bearer <your-jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "My Journey"}'
```

---

## Documentation

### Development Guides
- [Backend Development Guide](./CLAUDE.md) - Complete NestJS architecture guide
- [E2E Testing Strategy](./docs/E2E_TESTING_STRATEGY.md) - Testing patterns and parallel execution
- [Docker Setup Guide](./docs/DOCKER_TESTING_SETUP.md) - Docker configuration details

### Data Model
- [Data Model Comprehensive](./docs/DATA_MODEL_COMPREHENSIVE.md) - Complete API specification
- [Data Model Quick Reference](./docs/DATA_MODEL_QUICK_REFERENCE.md) - Quick lookup guide
- [Data Model Visual Summary](./docs/DATA_MODEL_VISUAL_SUMMARY.md) - Visual diagrams

### Integration Guides
- [GitHub Projects Integration](./docs/GITHUB_PROJECTS_INTEGRATION.md) - GitHub integration
- [Docker Testing Implementation](./docs/DOCKER_TESTING_IMPLEMENTATION_PLAN.md) - Implementation details

---

## Tech Stack

### Backend
- **Framework**: NestJS 10.x
- **Language**: TypeScript 5.x
- **Database**: PostgreSQL (via Supabase)
- **ORM**: Prisma
- **Authentication**: Supabase Auth (JWT)
- **API Docs**: Scalar (OpenAPI/Swagger)

### Development
- **Package Manager**: pnpm 8.x
- **Monorepo**: pnpm workspaces
- **Containerization**: Docker + Docker Compose
- **Hot Reload**: Docker volumes + nodemon

### Testing
- **Framework**: Jest
- **E2E Tests**: Supertest + Local Supabase
- **Parallel Execution**: Jest workers (CPU-adaptive)
- **Test Isolation**: Worker-specific databases

### DevOps
- **Local Database**: Supabase CLI (PostgreSQL + Auth)
- **Parallel Development**: Git worktrees with port isolation
- **Smart Scripts**: Environment-aware automation

---

## Troubleshooting

### Port Already in Use

```bash
# Find process using port 3000
lsof -ti:3000

# Kill the process
lsof -ti:3000 | xargs kill -9

# Or use a different port in .env
PORT=3001
```

### Docker Container Won't Start

```bash
# View logs
docker compose logs backend

# Rebuild from scratch
docker compose down -v
docker compose build --no-cache
docker compose up
```

### Supabase Not Running

```bash
# Check status
supabase status

# If not running, start it
supabase start

# If issues persist, stop and restart
supabase stop
supabase start
```

### Database Migration Issues

```bash
# Reset database (WARNING: deletes all data)
cd apps/backend
npx prisma migrate reset

# Create new migration
npx prisma migrate dev --name fix_schema

# Regenerate Prisma client
npx prisma generate
```

### Worktree Cleanup Issues

```bash
# Force remove worktree
git worktree remove --force <worktree-path>

# Clean up Docker containers manually
docker ps -a | grep worktree-branch-name
docker rm -f <container-id>

# Nuclear option: remove all containers
docker compose down -v
```

### Test Failures

```bash
# Ensure Supabase is running
supabase status

# Check test database configuration
cat apps/backend/.env.test

# Run tests sequentially for debugging
cd apps/backend
pnpm test:e2e -- --runInBand

# Reset test databases
npx prisma migrate reset
```

---

## Contributing

This project follows NestJS best practices:
- Feature-based module organization
- Dependency injection
- BaseService pattern for consistent error handling
- Factory pattern for test data
- Comprehensive E2E test coverage

See [CLAUDE.md](./CLAUDE.md) for detailed development guidelines.

---

## License

MIT
