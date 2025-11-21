# E2E Testing Strategy for User Story Mapping Tool Backend

**Version:** 1.1
**Last Updated:** 2025-11-19
**Status:** Implementation Plan (Updated with Reusable Code & Cleanup Strategy)

---

## Executive Summary

This document outlines the end-to-end (E2E) testing strategy for the User Story Mapping Tool backend API. Testing is organized into **3 tiers** based on complexity, starting with foundational tests and progressively adding more sophisticated scenarios.

**Core Principles:**
- 🔄 **Reusable Code First** - Fixtures, factories, and helpers eliminate duplication
- 🌐 **Live Supabase Always** - Test against real Supabase PostgreSQL (no mocks)
- 🧹 **Aggressive Data Cleanup** - Every test cleans up after itself

**Tech Stack Decision:**
- ✅ **Jest** - Industry standard for NestJS, already configured, mature ecosystem
- ✅ **Supertest** - HTTP assertion library, already installed, NestJS default
- ✅ **Live Supabase Database** - Separate Supabase project for real integration testing
- ❌ **NOT Mocks/Stubs** - No mocking Prisma or database calls in E2E tests
- ❌ **NOT Vitest** - While faster, Jest has better NestJS ecosystem support
- ❌ **NOT Pactum** - Limited community support compared to Supertest

---

## Table of Contents

1. [Tool Selection & Rationale](#tool-selection--rationale)
2. [Testing Philosophy](#testing-philosophy)
3. [Database Strategy (Live Supabase)](#database-strategy-live-supabase)
4. [Reusable Code Architecture](#reusable-code-architecture)
5. [Data Cleanup Strategy](#data-cleanup-strategy)
6. [Test Tiers Overview](#test-tiers-overview)
7. [Tier 1: Foundation Tests](#tier-1-foundation-tests)
8. [Tier 2: Complex Operations](#tier-2-complex-operations)
9. [Tier 3: Edge Cases & Optimizations](#tier-3-edge-cases--optimizations)
10. [Implementation Patterns](#implementation-patterns)
11. [Test Data Management with Fixtures](#test-data-management-with-fixtures)
12. [CI/CD Integration](#cicd-integration)

---

## Tool Selection & Rationale

### Why Jest? (2025 Analysis)

**Pros:**
- ✅ Official NestJS documentation and CLI support
- ✅ Mature ecosystem with extensive plugins
- ✅ Built-in support for TypeScript via ts-jest
- ✅ Excellent NestJS-specific community resources
- ✅ Already configured in our project
- ✅ Comprehensive snapshot testing capabilities
- ✅ Parallel test execution with worker threads

**Cons:**
- ❌ Slower than Vitest (acceptable tradeoff for stability)
- ❌ ESM support requires configuration (not an issue for us)

**Verdict:** Jest is the right choice for NestJS E2E testing in 2025.

### Why Supertest?

**Pros:**
- ✅ NestJS default HTTP testing library
- ✅ Simple, chainable API for HTTP assertions
- ✅ Works seamlessly with Jest
- ✅ Mature and stable (battle-tested)
- ✅ Already installed in our project

**Cons:**
- ❌ Limited data management features vs Pactum
- ❌ No built-in mock server capabilities

**Verdict:** Supertest is sufficient for our REST API testing needs.

### Database Strategy: Live Supabase Only

**CRITICAL DECISION: ALWAYS USE LIVE SUPABASE DATABASE**

**No Mocks. No Stubs. No In-Memory Databases.**

**Why Live Supabase?**
- ✅ **Real integration testing** - Tests actual Prisma queries against PostgreSQL
- ✅ **Catches schema issues** - Validates migrations and constraints
- ✅ **Supabase-specific features** - RLS policies, triggers, extensions work as expected
- ✅ **JWT validation** - Tests real Supabase Auth token verification
- ✅ **Production parity** - What you test is what you deploy
- ✅ **Confidence** - If tests pass, production will work
- ❌ **Slower than mocks** - Acceptable tradeoff for true E2E confidence

**Implementation Strategy:**
- ✅ **Dedicated test Supabase project** (never share with dev/prod)
- ✅ **Database cleanup after EVERY test** (no test pollution)
- ✅ **Automated cleanup in beforeEach/afterEach hooks**
- ❌ **Never mock PrismaService** in E2E tests (unit tests only)
- ❌ **Never use in-memory SQLite** (schema incompatibilities)

---

## Testing Philosophy

### What We Test (Concrete Functionality)

✅ **DO Test:**
- Authentication flows (signup, login, JWT validation)
- CRUD operations for all entities
- Business logic (sort order calculation, dependency cleanup)
- API contracts (request/response schemas, status codes)
- Error handling (validation errors, not found, unauthorized)
- Data integrity (cascading deletes, foreign keys)

❌ **DON'T Test (Yet):**
- Race conditions and concurrency (Tier 3 future work)
- Performance benchmarks (separate tooling)
- UI/Frontend integration (separate E2E suite)
- Third-party service behavior (Supabase internals)

### No Vanity Tests

Every test must validate **concrete, user-facing functionality**:
- ✅ "User can create a journey with valid data"
- ✅ "Deleting a release moves stories to Unassigned"
- ❌ "Controller is defined" (vanity test)
- ❌ "Service has a method called create" (vanity test)

---

## Reusable Code Architecture

**PRINCIPLE: Write Once, Reuse Everywhere**

Every piece of test code should be written with reusability in mind. No copy-paste between tests.

### Reusable Code Layers

```
test/
├── helpers/              # Reusable utilities (1 function = 1 file)
│   ├── test-app.ts      # App initialization
│   ├── auth.ts          # Authentication helpers
│   ├── database.ts      # Database cleanup
│   └── assertions.ts    # Custom matchers
├── fixtures/            # Test data builders (reusable patterns)
│   ├── user.fixture.ts
│   ├── journey.fixture.ts
│   ├── story.fixture.ts
│   └── complete-map.fixture.ts
├── factories/           # Entity creators (HTTP calls)
│   ├── journey.factory.ts
│   ├── step.factory.ts
│   ├── release.factory.ts
│   └── story.factory.ts
├── setup.ts            # Global test setup
└── *.e2e-spec.ts       # Actual test files (thin, mostly assertions)
```

### Helper Functions: Single Responsibility

Each helper does ONE thing and does it well:

```typescript
// ✅ GOOD: Focused helper
export async function createAuthToken(app: INestApplication): Promise<string> {
  const response = await request(app.getHttpServer())
    .post('/api/auth/signup')
    .send({ email: generateUniqueEmail(), password: 'Test1234!' });
  return response.body.access_token;
}

// ❌ BAD: Helper does too much
export async function setupTestEnvironment(app) {
  // Creates users, journeys, stories, etc. - too coupled!
}
```

### Fixtures: Declarative Test Data

Fixtures define WHAT you want, not HOW to create it:

```typescript
// test/fixtures/story.fixture.ts
export const storyFixtures = {
  minimal: {
    title: 'Minimal Story',
    step_id: '', // Populated by test
    release_id: '', // Populated by test
  },

  complete: {
    title: 'Complete Story',
    description: 'Full description',
    status: 'IN_PROGRESS',
    step_id: '',
    release_id: '',
  },

  withDependencies: {
    title: 'Story with Dependencies',
    step_id: '',
    release_id: '',
    dependencies: ['story-1', 'story-2'], // IDs populated by test
  },
};
```

### Factories: HTTP Entity Creators

Factories make HTTP calls to create entities (using fixtures):

```typescript
// test/factories/story.factory.ts
import { authenticatedRequest } from '../helpers/auth';
import { storyFixtures } from '../fixtures/story.fixture';

export async function createStory(
  app: INestApplication,
  token: string,
  overrides?: Partial<typeof storyFixtures.minimal>
) {
  const data = { ...storyFixtures.minimal, ...overrides };

  const response = await authenticatedRequest(app, token)
    .post('/api/stories')
    .send(data)
    .expect(201);

  return response.body;
}

export async function createStoryWithDependencies(
  app: INestApplication,
  token: string,
  stepId: string,
  releaseId: string,
  dependencyIds: string[]
) {
  const story = await createStory(app, token, {
    ...storyFixtures.withDependencies,
    step_id: stepId,
    release_id: releaseId,
  });

  // Add dependencies
  for (const targetId of dependencyIds) {
    await authenticatedRequest(app, token)
      .post(`/api/stories/${story.id}/dependencies`)
      .send({ target_story_id: targetId, relationship_type: 'blocked_by' })
      .expect(201);
  }

  return story;
}
```

### Usage in Tests: Maximum Reuse

Tests become thin wrappers around assertions:

```typescript
// test/stories.e2e-spec.ts
describe('Stories (E2E)', () => {
  let app: INestApplication;
  let token: string;
  let journey: any;
  let step: any;
  let release: any;

  beforeEach(async () => {
    await resetDatabase(); // Helper
    app = await createTestApp(); // Helper
    token = await createAuthToken(app); // Helper

    // Use factories to set up test data
    journey = await createJourney(app, token); // Factory
    step = await createStep(app, token, journey.id); // Factory
    release = await createRelease(app, token); // Factory
  });

  it('should create story with dependencies', async () => {
    // Create target stories
    const story1 = await createStory(app, token, { // Factory
      step_id: step.id,
      release_id: release.id,
    });

    const story2 = await createStory(app, token, {
      step_id: step.id,
      release_id: release.id,
    });

    // Create story with dependencies (uses factory)
    const story = await createStoryWithDependencies(
      app,
      token,
      step.id,
      release.id,
      [story1.id, story2.id]
    );

    // Verify
    expect(story.id).toBeDefined();

    const dependencies = await authenticatedRequest(app, token)
      .get(`/api/stories/${story.id}/dependencies`)
      .expect(200);

    expect(dependencies.body).toHaveLength(2);
  });
});
```

### Benefits of This Architecture

- ✅ **DRY** - No code duplication across tests
- ✅ **Maintainable** - Change fixture in one place, all tests update
- ✅ **Readable** - Tests focus on WHAT is being tested, not HOW
- ✅ **Fast to write** - New tests compose existing helpers/factories
- ✅ **Easy to debug** - Helpers are small and focused

---

## Data Cleanup Strategy

**CRITICAL: Every test MUST clean up its data**

No test should leave data in the database. Ever.

### Cleanup Approaches

#### Approach 1: Global Database Reset (Recommended for Tier 1)

Clean the entire database before each test:

```typescript
// test/helpers/database.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL, // Points to test Supabase
});

export async function resetDatabase() {
  // Delete in reverse dependency order (critical!)
  await prisma.comment.deleteMany();
  await prisma.storyLink.deleteMany(); // Dependencies
  await prisma.story.deleteMany();
  await prisma.step.deleteMany();
  await prisma.release.deleteMany();
  await prisma.journey.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.persona.deleteMany();

  // Clean auth users (if using Supabase test project)
  // Note: Requires admin API key
}

export async function disconnectDatabase() {
  await prisma.$disconnect();
}
```

**Usage:**

```typescript
// test/setup.ts (global setup)
import { resetDatabase, disconnectDatabase } from './helpers/database';

beforeEach(async () => {
  await resetDatabase(); // Clean before each test
});

afterAll(async () => {
  await disconnectDatabase(); // Close connections
});
```

**Pros:**
- ✅ Simple and reliable
- ✅ Ensures complete isolation
- ✅ No risk of test pollution

**Cons:**
- ❌ Slower (acceptable for <100 tests)

#### Approach 2: Transactional Rollback (Future Optimization)

Use Prisma transactions to rollback after each test:

```typescript
// test/helpers/database.ts
export async function withTransaction<T>(
  callback: (tx: PrismaClient) => Promise<T>
): Promise<T> {
  return await prisma.$transaction(async (tx) => {
    const result = await callback(tx);
    throw new Error('ROLLBACK'); // Force rollback
  }).catch((error) => {
    if (error.message === 'ROLLBACK') {
      return undefined; // Expected rollback
    }
    throw error; // Real error
  });
}
```

**Pros:**
- ✅ Faster than full database reset

**Cons:**
- ❌ Doesn't work with Supabase Auth (users persist)
- ❌ Complex to set up correctly
- ❌ May miss edge cases

**Decision:** Use Approach 1 (global reset) for MVP

### Cleanup Verification

Add assertions to verify cleanup worked:

```typescript
// test/helpers/assertions.ts
export async function assertDatabaseIsEmpty() {
  const counts = await Promise.all([
    prisma.journey.count(),
    prisma.step.count(),
    prisma.release.count(),
    prisma.story.count(),
    prisma.comment.count(),
  ]);

  const total = counts.reduce((sum, count) => sum + count, 0);

  if (total > 0) {
    throw new Error(`Database not empty! Found ${total} records`);
  }
}
```

**Usage in tests:**

```typescript
afterEach(async () => {
  await assertDatabaseIsEmpty(); // Verify cleanup
});
```

### Supabase Auth Cleanup

Supabase users persist even after database reset. Clean them explicitly:

```typescript
// test/helpers/auth-cleanup.ts
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Admin key
);

export async function deleteAllTestUsers() {
  // List all users
  const { data: users } = await supabaseAdmin.auth.admin.listUsers();

  // Delete each user
  for (const user of users.users) {
    await supabaseAdmin.auth.admin.deleteUser(user.id);
  }
}
```

**Add to global cleanup:**

```typescript
// test/setup.ts
import { deleteAllTestUsers } from './helpers/auth-cleanup';

beforeEach(async () => {
  await resetDatabase();
  await deleteAllTestUsers(); // Clean Supabase Auth
});
```

### Cleanup Best Practices

1. **Always clean before, not after**
   ```typescript
   // ✅ GOOD: Clean before each test
   beforeEach(async () => {
     await resetDatabase();
   });

   // ❌ BAD: Clean after each test (skips on failure)
   afterEach(async () => {
     await resetDatabase();
   });
   ```

2. **Delete in reverse dependency order**
   ```typescript
   // ✅ GOOD: Children first, parents last
   await prisma.comment.deleteMany(); // Child
   await prisma.story.deleteMany();   // Parent

   // ❌ BAD: Parents first (foreign key errors!)
   await prisma.story.deleteMany();
   await prisma.comment.deleteMany();
   ```

3. **Use deleteMany, not truncate**
   ```typescript
   // ✅ GOOD: Works with foreign keys
   await prisma.story.deleteMany();

   // ❌ BAD: Breaks with foreign keys
   await prisma.$executeRaw`TRUNCATE TABLE stories CASCADE`;
   ```

4. **Verify cleanup in CI/CD**
   ```typescript
   // Add to test teardown
   afterAll(async () => {
     await assertDatabaseIsEmpty(); // Fail CI if data leaked
     await disconnectDatabase();
   });
   ```

---

## Database Strategy (Live Supabase)

### Setup: Dedicated Test Supabase Project

**Option 1: Separate Supabase Test Project (Recommended for MVP)**

```env
# .env.test
DATABASE_URL="postgresql://postgres:[PASSWORD]@[TEST_PROJECT].supabase.co:5432/postgres"
SUPABASE_URL="https://[TEST_PROJECT].supabase.co"
SUPABASE_ANON_KEY="[TEST_ANON_KEY]"
```

**Pros:**
- ✅ Matches production environment exactly
- ✅ Tests Supabase-specific features
- ✅ No Docker setup required

**Cons:**
- ❌ Requires separate Supabase project
- ❌ Slower than local database

**Option 2: Docker PostgreSQL (Future Enhancement)**

```yaml
# docker-compose.test.yml
services:
  postgres-test:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
      POSTGRES_DB: usm_test
    ports:
      - "5433:5432"
```

**Pros:**
- ✅ Faster local execution
- ✅ Full control over database
- ✅ Works offline

**Cons:**
- ❌ Doesn't test Supabase-specific features
- ❌ Requires Docker setup

**Decision for MVP:** Start with Option 1 (separate Supabase project)

### Database Reset Strategy

```typescript
// test/setup.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function resetDatabase() {
  // Delete in reverse dependency order
  await prisma.comment.deleteMany();
  await prisma.storyLink.deleteMany();
  await prisma.story.deleteMany();
  await prisma.step.deleteMany();
  await prisma.release.deleteMany();
  await prisma.journey.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.persona.deleteMany();
}

beforeEach(async () => {
  await resetDatabase();
});

afterAll(async () => {
  await prisma.$disconnect();
});
```

---

## Test Tiers Overview

| Tier | Focus | Complexity | Est. Tests | Timeline |
|------|-------|------------|------------|----------|
| **Tier 1** | Foundation CRUD + Auth | Low | 40-50 | Week 1 |
| **Tier 2** | Complex Operations | Medium | 30-40 | Week 2 |
| **Tier 3** | Edge Cases & Concurrency | High | 20-30 | Future |

**Total Coverage Target:** 90-100 E2E tests

---

## Tier 1: Foundation Tests

**Goal:** Validate basic CRUD operations, authentication, and happy paths.

**Characteristics:**
- Single-user scenarios
- No race conditions
- Happy path + basic error cases
- Isolated operations (no complex workflows)

### 1.1 Authentication Module (8 tests)

**File:** `test/auth.e2e-spec.ts`

**Scenarios:**
1. ✅ POST /api/auth/signup - Create new user account
2. ✅ POST /api/auth/signup - Reject duplicate email
3. ✅ POST /api/auth/signup - Validate password requirements
4. ✅ POST /api/auth/login - Login with valid credentials
5. ✅ POST /api/auth/login - Reject invalid credentials
6. ✅ GET /api/auth/profile - Get authenticated user profile
7. ✅ GET /api/auth/profile - Reject unauthenticated request
8. ✅ POST /api/auth/logout - Logout successfully

**Why These Tests Matter:**
- Auth is the foundation of all other endpoints
- Validates Supabase JWT integration
- Ensures security guardrails work

### 1.2 Health Check (1 test)

**File:** `test/health.e2e-spec.ts`

**Scenarios:**
1. ✅ GET /api/health - Returns 200 OK

### 1.3 Journeys CRUD (7 tests)

**File:** `test/journeys.e2e-spec.ts`

**Scenarios:**
1. ✅ POST /api/journeys - Create journey with auth
2. ✅ POST /api/journeys - Reject unauthenticated request
3. ✅ GET /api/journeys - List all journeys
4. ✅ GET /api/journeys/:id - Get single journey
5. ✅ PATCH /api/journeys/:id - Update journey name
6. ✅ DELETE /api/journeys/:id - Delete journey (cascades to steps)
7. ✅ GET /api/journeys/:id - Return 404 for non-existent journey

**Validates:**
- Basic CRUD operations
- Auth guard enforcement
- Cascade delete behavior
- Error handling

### 1.4 Steps CRUD (7 tests)

**File:** `test/steps.e2e-spec.ts`

**Scenarios:**
1. ✅ POST /api/steps - Create step within journey
2. ✅ GET /api/steps - List all steps
3. ✅ GET /api/journeys/:journeyId/steps - Get steps for journey
4. ✅ GET /api/steps/:id - Get single step
5. ✅ PATCH /api/steps/:id - Update step name
6. ✅ DELETE /api/steps/:id - Delete step (cascades to stories)
7. ✅ POST /api/steps - Reject step with invalid journey_id (FK constraint)

**Validates:**
- Nested resource creation
- Foreign key constraints
- Query filtering

### 1.5 Releases CRUD (8 tests)

**File:** `test/releases.e2e-spec.ts`

**Scenarios:**
1. ✅ POST /api/releases - Create release
2. ✅ GET /api/releases - List all releases (includes Unassigned)
3. ✅ GET /api/releases/:id - Get single release
4. ✅ PATCH /api/releases/:id - Update release name
5. ✅ DELETE /api/releases/:id - Delete release (moves stories to Unassigned)
6. ✅ DELETE /api/releases/:id - Prevent deletion of Unassigned release
7. ✅ POST /api/releases - Auto-create Unassigned on first release
8. ✅ GET /api/releases - Verify Unassigned release exists

**Validates:**
- Special business logic (Unassigned release)
- Story migration on delete
- Business rule enforcement

### 1.6 Stories CRUD (9 tests)

**File:** `test/stories.e2e-spec.ts`

**Scenarios:**
1. ✅ POST /api/stories - Create story in cell (step + release)
2. ✅ POST /api/stories - Auto-calculate sort_order (1000-spacing)
3. ✅ GET /api/stories - List all stories
4. ✅ GET /api/stories?step_id=X - Filter by step
5. ✅ GET /api/stories?release_id=Y - Filter by release
6. ✅ GET /api/stories?step_id=X&release_id=Y - Filter by cell
7. ✅ PATCH /api/stories/:id - Update story title
8. ✅ DELETE /api/stories/:id - Delete story (removes dependencies)
9. ✅ POST /api/stories - Reject story with invalid step_id/release_id

**Validates:**
- Sort order calculation (1000-based spacing)
- Query parameter filtering
- Dependency cleanup on delete

### 1.7 Tags CRUD (6 tests)

**File:** `test/tags.e2e-spec.ts`

**Scenarios:**
1. ✅ POST /api/tags - Create tag
2. ✅ GET /api/tags - List all tags
3. ✅ GET /api/tags/:id - Get single tag
4. ✅ DELETE /api/tags/:id - Delete tag
5. ✅ POST /api/tags - Reject duplicate tag name
6. ✅ PATCH /api/tags/:id - Update NOT allowed (per spec)

**Validates:**
- No update endpoint (spec compliance)
- Unique constraint on name

### 1.8 Personas CRUD (7 tests)

**File:** `test/personas.e2e-spec.ts`

**Scenarios:**
1. ✅ POST /api/personas - Create persona
2. ✅ GET /api/personas - List all personas
3. ✅ GET /api/personas/:id - Get single persona
4. ✅ PATCH /api/personas/:id - Update persona
5. ✅ DELETE /api/personas/:id - Delete persona
6. ✅ POST /api/personas - Reject duplicate persona name
7. ✅ POST /api/personas - Validate required fields

### 1.9 Comments CRUD (6 tests)

**File:** `test/comments.e2e-spec.ts`

**Scenarios:**
1. ✅ POST /api/stories/:storyId/comments - Create comment
2. ✅ POST /api/stories/:storyId/comments - Auto-populate author from JWT
3. ✅ GET /api/stories/:storyId/comments - List comments for story
4. ✅ GET /api/stories/:storyId/comments - Include is_current_user flag
5. ✅ PATCH /api/comments/:id - Update comment (author only)
6. ✅ DELETE /api/comments/:id - Delete comment (author only)

**Validates:**
- JWT user extraction
- Author-based permissions
- Computed fields (is_current_user)

### Tier 1 Summary

**Total Tests:** 59 tests
**Focus:** Individual endpoints, basic CRUD, auth, simple validation
**Coverage:** ~70% of core user flows

---

## Tier 2: Complex Operations

**Goal:** Validate complex business logic, multi-step workflows, and data integrity.

**Characteristics:**
- Multi-entity operations
- Business rule enforcement
- Reordering and moving operations
- Dependency management

### 2.1 Journey Reordering (4 tests)

**File:** `test/journeys-reorder.e2e-spec.ts`

**Scenarios:**
1. ✅ POST /api/journeys/:id/reorder - Reorder journey to position 0
2. ✅ POST /api/journeys/:id/reorder - Reorder journey to middle position
3. ✅ POST /api/journeys/:id/reorder - Reject negative sort_order
4. ✅ POST /api/journeys/:id/reorder - Validate all journeys maintain unique sort_order

**Validates:**
- Sort order recalculation
- 0-based indexing
- Data consistency

### 2.2 Step Reordering (5 tests)

**File:** `test/steps-reorder.e2e-spec.ts`

**Scenarios:**
1. ✅ POST /api/steps/:id/reorder - Reorder step within journey
2. ✅ POST /api/steps/:id/reorder - Validate sort_order scoped to journey
3. ✅ POST /api/steps/:id/reorder - Multiple reorders maintain consistency
4. ✅ GET /api/steps/:id/stories - Get all stories for step (across releases)
5. ✅ GET /api/steps/:id/stories - Verify stories ordered by sort_order

**Validates:**
- Scoped sort order (within parent)
- Cross-release story queries

### 2.3 Release Reordering (5 tests)

**File:** `test/releases-reorder.e2e-spec.ts`

**Scenarios:**
1. ✅ POST /api/releases/:id/reorder - Reorder release
2. ✅ POST /api/releases/:id/reorder - Unassigned release maintains position
3. ✅ POST /api/releases/:id/reorder - Validate global sort_order
4. ✅ GET /api/releases/:id/stories - Get all stories for release (across steps)
5. ✅ GET /api/releases/:id/stories - Verify stories ordered by sort_order

**Validates:**
- Global sort order
- Special handling for Unassigned release

### 2.4 Story Moving (6 tests)

**File:** `test/stories-move.e2e-spec.ts`

**Scenarios:**
1. ✅ POST /api/stories/:id/move - Move story to different cell
2. ✅ POST /api/stories/:id/move - Auto-recalculate sort_order in target cell
3. ✅ POST /api/stories/:id/move - Move to different step (same release)
4. ✅ POST /api/stories/:id/move - Move to different release (same step)
5. ✅ POST /api/stories/:id/move - Move to completely different cell
6. ✅ POST /api/stories/:id/move - Verify 1000-spacing maintained in target

**Validates:**
- Complex sort order logic
- Cell-based positioning
- Data integrity after moves

### 2.5 Story Dependencies (7 tests)

**File:** `test/story-dependencies.e2e-spec.ts`

**Scenarios:**
1. ✅ POST /api/stories/:id/dependencies - Create dependency (blocked_by)
2. ✅ GET /api/stories/:id/dependencies - List dependencies for story
3. ✅ DELETE /api/stories/:sourceId/dependencies/:targetId - Remove dependency
4. ✅ POST /api/stories/:id/dependencies - Prevent self-dependency
5. ✅ POST /api/stories/:id/dependencies - Prevent duplicate dependencies
6. ✅ DELETE /api/stories/:id - Verify dependencies cleaned up on delete
7. ✅ GET /api/stories/:id - Include dependencies in response

**Validates:**
- Bidirectional relationships
- Cascade cleanup
- Business rules

### 2.6 Cascade Delete Workflows (6 tests)

**File:** `test/cascade-deletes.e2e-spec.ts`

**Scenarios:**
1. ✅ DELETE /api/journeys/:id - Cascade to steps and stories
2. ✅ DELETE /api/steps/:id - Cascade to stories in that step
3. ✅ DELETE /api/releases/:id - Move stories to Unassigned (not delete)
4. ✅ DELETE /api/stories/:id - Clean up comments and dependencies
5. ✅ DELETE /api/tags/:id - Remove tag associations (not stories)
6. ✅ DELETE /api/personas/:id - Remove persona associations (not stories)

**Validates:**
- Correct cascade behavior per spec
- Data integrity
- Business logic compliance

### 2.7 Multi-Entity Workflows (4 tests)

**File:** `test/workflows.e2e-spec.ts`

**Scenarios:**
1. ✅ Create complete story map (journey → steps → releases → stories)
2. ✅ Add tags and personas to existing story
3. ✅ Move story and verify all associations intact
4. ✅ Delete journey and verify all nested entities removed

**Validates:**
- End-to-end workflows
- Data consistency across entities
- Real-world usage patterns

### Tier 2 Summary

**Total Tests:** 37 tests
**Focus:** Complex operations, business logic, data integrity
**Coverage:** ~90% of core user flows

---

## Tier 3: Edge Cases & Optimizations

**Goal:** Handle edge cases, race conditions, and optimize performance.

**Characteristics:**
- Concurrent operations
- Boundary conditions
- Performance validation
- Error recovery

### 3.1 Concurrent Operations (Future)

**Scenarios:**
- Multiple users creating stories in same cell simultaneously
- Concurrent reorder operations
- Race condition handling for sort_order

**Decision:** Deferred to future iteration (requires transaction-level testing)

### 3.2 Boundary Conditions (Future)

**Scenarios:**
- Maximum field lengths
- Sort order overflow (unlikely with Number.MAX_SAFE_INTEGER)
- Empty/null value handling

### 3.3 Performance Validation (Future)

**Scenarios:**
- Query performance with 1000+ stories
- Pagination effectiveness
- N+1 query detection

---

## Implementation Patterns

### Pattern 1: Test Module Setup

```typescript
// test/helpers/test-app.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../../src/app.module';

export async function createTestApp(): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();

  // Apply same middleware as production
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.init();
  return app;
}
```

### Pattern 2: Authenticated Request Helper

```typescript
// test/helpers/auth.ts
import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';

export async function createTestUser(
  app: INestApplication,
  email: string = 'test@example.com',
  password: string = 'Password123!',
) {
  const response = await request(app.getHttpServer())
    .post('/api/auth/signup')
    .send({ email, password })
    .expect(201);

  return response.body.access_token;
}

export function authenticatedRequest(
  app: INestApplication,
  token: string,
) {
  return request(app.getHttpServer()).set('Authorization', `Bearer ${token}`);
}
```

### Pattern 3: Test Factory for Entities

```typescript
// test/factories/journey.factory.ts
import { INestApplication } from '@nestjs/common';
import { authenticatedRequest } from '../helpers/auth';

export async function createJourney(
  app: INestApplication,
  token: string,
  name: string = 'Test Journey',
) {
  const response = await authenticatedRequest(app, token)
    .post('/api/journeys')
    .send({ name })
    .expect(201);

  return response.body;
}
```

### Pattern 4: Complete E2E Test Example

```typescript
// test/journeys.e2e-spec.ts
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp } from './helpers/test-app';
import { createTestUser, authenticatedRequest } from './helpers/auth';
import { resetDatabase } from './helpers/database';

describe('Journeys (E2E)', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    await resetDatabase();
    authToken = await createTestUser(app);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/journeys', () => {
    it('should create a journey with valid data', async () => {
      const response = await authenticatedRequest(app, authToken)
        .post('/api/journeys')
        .send({ name: 'Customer Journey' })
        .expect(201);

      expect(response.body).toMatchObject({
        id: expect.any(String),
        name: 'Customer Journey',
        sort_order: expect.any(Number),
        created_at: expect.any(String),
        updated_at: expect.any(String),
        created_by: expect.any(String),
      });
    });

    it('should reject unauthenticated requests', async () => {
      await request(app.getHttpServer())
        .post('/api/journeys')
        .send({ name: 'Customer Journey' })
        .expect(401);
    });

    it('should reject invalid data', async () => {
      await authenticatedRequest(app, authToken)
        .post('/api/journeys')
        .send({ name: '' }) // Empty name
        .expect(400);
    });
  });

  describe('GET /api/journeys', () => {
    it('should list all journeys', async () => {
      // Create test data
      await authenticatedRequest(app, authToken)
        .post('/api/journeys')
        .send({ name: 'Journey 1' });

      await authenticatedRequest(app, authToken)
        .post('/api/journeys')
        .send({ name: 'Journey 2' });

      // Fetch list
      const response = await authenticatedRequest(app, authToken)
        .get('/api/journeys')
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body[0].name).toBe('Journey 1');
      expect(response.body[1].name).toBe('Journey 2');
    });
  });

  describe('DELETE /api/journeys/:id', () => {
    it('should delete journey and cascade to steps', async () => {
      // Create journey with step
      const journey = await authenticatedRequest(app, authToken)
        .post('/api/journeys')
        .send({ name: 'Journey to Delete' })
        .then(res => res.body);

      await authenticatedRequest(app, authToken)
        .post('/api/steps')
        .send({ name: 'Step 1', journey_id: journey.id })
        .expect(201);

      // Delete journey
      await authenticatedRequest(app, authToken)
        .delete(`/api/journeys/${journey.id}`)
        .expect(200);

      // Verify journey is gone
      await authenticatedRequest(app, authToken)
        .get(`/api/journeys/${journey.id}`)
        .expect(404);

      // Verify steps are gone (cascade)
      const steps = await authenticatedRequest(app, authToken)
        .get(`/api/journeys/${journey.id}/steps`)
        .expect(404); // Journey doesn't exist anymore
    });
  });
});
```

---

## Test Data Management with Fixtures

**See [Reusable Code Architecture](#reusable-code-architecture) for complete implementation patterns.**

This section provides additional guidance on test data management using the fixtures and factories pattern.

### Factory Index: Central Import

Create a single entry point for all factories:

```typescript
// test/factories/index.ts
// Entity factories (HTTP calls)
export { createJourney } from './journey.factory';
export { createStep } from './step.factory';
export { createRelease } from './release.factory';
export { createStory } from './story.factory';
export { createTag } from './tag.factory';
export { createPersona } from './persona.factory';
export { createComment } from './comment.factory';
export { createStoryLink } from './story-link.factory';

// Complex scenarios
export { createCompleteStoryMap } from './complete-map.factory';
export { createStoryWithDependencies } from './story.factory';
```

**Usage:**

```typescript
import { createJourney, createStep, createStory } from './factories';
// Clean imports, all factories available
```

### Fixture Index: Reusable Test Data

Centralize all test data fixtures:

```typescript
// test/fixtures/index.ts
export { journeyFixtures } from './journey.fixture';
export { stepFixtures } from './step.fixture';
export { releaseFixtures } from './release.fixture';
export { storyFixtures } from './story.fixture';
export { userFixtures } from './user.fixture';
```

### Complex Scenario Factories

For Tier 2 tests, create factories for complete workflows:

```typescript
// test/factories/complete-map.factory.ts
import {
  createJourney,
  createStep,
  createRelease,
  createStory,
} from './index';

export async function createCompleteStoryMap(
  app: INestApplication,
  token: string,
  config?: {
    journeyName?: string;
    stepCount?: number;
    releaseCount?: number;
    storiesPerCell?: number;
  }
) {
  const {
    journeyName = 'E-commerce Journey',
    stepCount = 3,
    releaseCount = 2,
    storiesPerCell = 2,
  } = config || {};

  // Create journey
  const journey = await createJourney(app, token, journeyName);

  // Create steps
  const steps = await Promise.all(
    Array.from({ length: stepCount }, (_, i) =>
      createStep(app, token, `Step ${i + 1}`, journey.id)
    )
  );

  // Create releases
  const releases = await Promise.all(
    Array.from({ length: releaseCount }, (_, i) =>
      createRelease(app, token, `Release ${i + 1}`)
    )
  );

  // Create stories in each cell
  const stories = [];
  for (const step of steps) {
    for (const release of releases) {
      for (let i = 0; i < storiesPerCell; i++) {
        const story = await createStory(app, token, {
          title: `Story ${step.name} - ${release.name} - ${i + 1}`,
          step_id: step.id,
          release_id: release.id,
        });
        stories.push(story);
      }
    }
  }

  return {
    journey,
    steps,
    releases,
    stories,
  };
}
```

**Usage in tests:**

```typescript
it('should handle complex story map operations', async () => {
  const { journey, steps, releases, stories } = await createCompleteStoryMap(
    app,
    token,
    { stepCount: 5, releaseCount: 3, storiesPerCell: 3 }
  );

  // Test operates on full story map
  expect(stories).toHaveLength(45); // 5 steps × 3 releases × 3 stories
});
```

### Unique Data Generation

Avoid collisions with unique data generators:

```typescript
// test/helpers/unique.ts
let emailCounter = 0;
let nameCounter = 0;

export function generateUniqueEmail(): string {
  return `test-${Date.now()}-${emailCounter++}@example.com`;
}

export function generateUniqueName(prefix: string): string {
  return `${prefix}-${Date.now()}-${nameCounter++}`;
}
```

**Usage:**

```typescript
// test/fixtures/user.fixture.ts
import { generateUniqueEmail } from '../helpers/unique';

export const userFixtures = {
  default: () => ({
    email: generateUniqueEmail(),
    password: 'Test1234!',
  }),

  withCustomEmail: (email: string) => ({
    email,
    password: 'Test1234!',
  }),
};
```

### Data Cleanup with Factories

Factories should NOT clean up data - that's the test framework's job:

```typescript
// ❌ BAD: Factory cleans up after itself
export async function createJourney(...) {
  const journey = await request(...);

  // DON'T DO THIS - cleanup is test framework's responsibility
  return {
    ...journey,
    cleanup: async () => await deleteJourney(journey.id)
  };
}

// ✅ GOOD: Factory creates, test framework cleans
export async function createJourney(...) {
  const response = await request(...);
  return response.body; // Just return the data
}

// Cleanup happens in beforeEach
beforeEach(async () => {
  await resetDatabase(); // Global cleanup
});
```

### Best Practices Summary

1. **Fixtures define data** (WHAT)
2. **Factories create entities** (HOW via HTTP)
3. **Helpers provide utilities** (auth, unique data, assertions)
4. **Tests compose all three** (focused on assertions)
5. **Cleanup is automatic** (beforeEach hooks)

---

## CI/CD Integration

**CRITICAL: CI/CD MUST use live Supabase test database**

Never use in-memory databases or mocks in CI/CD. Tests in CI must match local tests exactly.

### Required GitHub Secrets

Set these secrets in your repository settings:

- `TEST_DATABASE_URL` - Connection string to dedicated test Supabase project
- `TEST_SUPABASE_URL` - Test Supabase project URL
- `TEST_SUPABASE_ANON_KEY` - Test Supabase anonymous key
- `TEST_SUPABASE_SERVICE_ROLE_KEY` - Test Supabase admin key (for cleanup)

**Security:** Never commit these values. Always use GitHub Secrets.

### GitHub Actions Example

```yaml
# .github/workflows/e2e-tests.yml
name: E2E Tests

on:
  pull_request:
  push:
    branches: [main]

jobs:
  e2e:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
        with:
          version: 8

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Run E2E tests (against live Supabase)
        env:
          # Live Supabase test database (REQUIRED)
          DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}
          SUPABASE_URL: ${{ secrets.TEST_SUPABASE_URL }}
          SUPABASE_ANON_KEY: ${{ secrets.TEST_SUPABASE_ANON_KEY }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.TEST_SUPABASE_SERVICE_ROLE_KEY }}
          NODE_ENV: test
        run: |
          cd apps/backend
          pnpm test:e2e

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        if: always()
        with:
          files: ./apps/backend/coverage/lcov.info

      - name: Verify database cleanup
        if: always()
        env:
          DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}
        run: |
          cd apps/backend
          # Fail CI if data leaked
          pnpm test:verify-cleanup
```

### Cleanup Verification Script

Add this to package.json:

```json
{
  "scripts": {
    "test:verify-cleanup": "ts-node test/scripts/verify-cleanup.ts"
  }
}
```

Create verification script:

```typescript
// test/scripts/verify-cleanup.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyCleanup() {
  const counts = await Promise.all([
    prisma.journey.count(),
    prisma.step.count(),
    prisma.release.count(),
    prisma.story.count(),
    prisma.comment.count(),
  ]);

  const total = counts.reduce((sum, count) => sum + count, 0);

  if (total > 0) {
    console.error(`❌ Database not clean! Found ${total} records`);
    process.exit(1);
  }

  console.log('✅ Database is clean');
  await prisma.$disconnect();
}

verifyCleanup();
```

### Local Test Commands

```json
{
  "scripts": {
    "test:e2e": "jest --config ./test/jest-e2e.json",
    "test:e2e:watch": "jest --config ./test/jest-e2e.json --watch",
    "test:e2e:cov": "jest --config ./test/jest-e2e.json --coverage",
    "test:e2e:tier1": "jest --config ./test/jest-e2e.json --testPathPattern='(auth|health|journeys|steps|releases|stories|tags|personas|comments).e2e-spec'",
    "test:e2e:tier2": "jest --config ./test/jest-e2e.json --testPathPattern='(reorder|move|dependencies|cascade|workflows).e2e-spec'"
  }
}
```

---

## Configuration Files Needed

### 1. Jest E2E Config

**File:** `apps/backend/test/jest-e2e.json`

```json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": ".",
  "testEnvironment": "node",
  "testRegex": ".e2e-spec.ts$",
  "transform": {
    "^.+\\.(t|j)s$": "ts-jest"
  },
  "moduleNameMapper": {
    "^@/(.*)$": "<rootDir>/../src/$1"
  },
  "setupFilesAfterEnv": ["<rootDir>/setup.ts"],
  "testTimeout": 30000,
  "maxWorkers": 1
}
```

### 2. Test Environment File

**File:** `apps/backend/.env.test`

```env
# Test Database
DATABASE_URL="postgresql://postgres:[PASSWORD]@[TEST_PROJECT].supabase.co:5432/postgres"
SUPABASE_URL="https://[TEST_PROJECT].supabase.co"
SUPABASE_ANON_KEY="[TEST_ANON_KEY]"

# Test Configuration
NODE_ENV=test
PORT=3001
```

---

## Success Metrics

### Tier 1 Goals
- ✅ 59 tests passing
- ✅ 70% endpoint coverage
- ✅ All CRUD operations validated
- ✅ Auth flows working

### Tier 2 Goals
- ✅ 96 total tests passing (59 + 37)
- ✅ 90% endpoint coverage
- ✅ Complex operations validated
- ✅ Data integrity proven

### Tier 3 Goals (Future)
- ✅ 116+ total tests
- ✅ 95%+ coverage
- ✅ Race conditions handled
- ✅ Performance benchmarks met

---

## Next Steps

1. ✅ **Review this document** - Approve testing strategy
2. ⏭️ **Setup test infrastructure** - Create helpers, factories, configs
3. ⏭️ **Implement Tier 1 tests** - Start with auth.e2e-spec.ts
4. ⏭️ **Validate Tier 1** - Ensure all 59 tests pass
5. ⏭️ **Implement Tier 2 tests** - Complex operations
6. ⏭️ **CI/CD Integration** - Add to GitHub Actions
7. ⏭️ **Plan Tier 3** - Revisit based on Tier 2 learnings

---

## References

**Internal Documentation:**
- `CLAUDE.md` - NestJS architecture patterns
- `docs/DATA_MODEL_COMPREHENSIVE.md` - API specifications
- `docs/DATA_MODEL_QUICK_REFERENCE.md` - Quick reference

**External Resources:**
- [NestJS Testing Docs](https://docs.nestjs.com/fundamentals/testing)
- [Prisma Integration Testing](https://www.prisma.io/docs/orm/prisma-client/testing/integration-testing)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Jest Documentation](https://jestjs.io/docs/getting-started)

---

**Document Status:** Ready for review and implementation

**Questions?** Review this strategy and provide feedback before we begin Tier 1 implementation.
