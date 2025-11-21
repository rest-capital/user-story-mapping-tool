---
date: 2025-11-19T23:21:35+0000
researcher: claude-sonnet-4-5
git_commit: 1b607b12a738a5d3173f13212d99a829c028890e
branch: main
repository: user-story-mapping-tool
topic: "E2E Testing Infrastructure and Authentication Tests"
tags: [testing, e2e, authentication, supabase, jest, infrastructure]
status: complete
last_updated: 2025-11-19
last_updated_by: claude-sonnet-4-5
type: implementation_strategy
---

# Handoff: E2E Testing Infrastructure Complete + Authentication Tests Passing

## Task(s)

**Status: COMPLETE** ✅

1. ✅ **Set up complete E2E testing infrastructure** (Option A from handoff document)
   - Created all configuration files (.env.test, jest-e2e.json, setup.ts)
   - Created 5 helper files for test utilities
   - Created 8 fixture files for test data
   - Created 7 factory files for entity creation
   - Added 5 test scripts to package.json

2. ✅ **Implement authentication E2E tests**
   - Created auth.e2e-spec.ts with 15 comprehensive tests
   - All tests passing (signup, login, profile, logout, auth guards)
   - Fixed multiple integration issues during implementation

3. ✅ **Set up Supabase service_role key for auth cleanup**
   - Added key to .env.test
   - Fixed lazy initialization bug in auth-cleanup.ts
   - Verified auth users are being cleaned up between tests

**Original Work From**: `thoughts/shared/handoffs/general/2025-11-19_17-39-21_e2e-testing-strategy-document.md`

## Critical References

- `docs/E2E_TESTING_STRATEGY.md` - Complete testing strategy with tier breakdown (59 Tier 1 tests, 37 Tier 2 tests)
- `.env.test` - Test environment configuration with Supabase credentials
- `test/setup.ts` - Global test setup with database cleanup hooks

## Recent Changes

### Configuration Files Created
- `apps/backend/.env.test:1-18` - Test environment configuration
- `apps/backend/test/jest-e2e.json:1-22` - Jest E2E configuration
- `apps/backend/test/setup.ts:1-37` - Global test setup with cleanup hooks
- `apps/backend/package.json:12-16` - Added 5 test scripts

### Helper Files Created
- `apps/backend/test/helpers/test-app.ts:1-35` - NestJS test app factory with global prefix
- `apps/backend/test/helpers/auth.ts:1-36` - Authentication helpers (FIXED: supertest import)
- `apps/backend/test/helpers/database.ts:1-41` - Database cleanup functions
- `apps/backend/test/helpers/auth-cleanup.ts:1-104` - Auth user cleanup with lazy initialization
- `apps/backend/test/helpers/unique.ts:1-19` - Unique data generators

### Fixture Files Created (8 files)
- `apps/backend/test/fixtures/user.fixture.ts:1-15`
- `apps/backend/test/fixtures/journey.fixture.ts:1-19`
- `apps/backend/test/fixtures/step.fixture.ts:1-19`
- `apps/backend/test/fixtures/release.fixture.ts:1-19`
- `apps/backend/test/fixtures/story.fixture.ts:1-27`
- `apps/backend/test/fixtures/tag.fixture.ts:1-13`
- `apps/backend/test/fixtures/persona.fixture.ts:1-19`
- `apps/backend/test/fixtures/comment.fixture.ts:1-14`
- `apps/backend/test/fixtures/index.ts:1-10` - Re-exports

### Factory Files Created (7 files)
- `apps/backend/test/factories/journey.factory.ts:1-24`
- `apps/backend/test/factories/step.factory.ts:1-29`
- `apps/backend/test/factories/release.factory.ts:1-24`
- `apps/backend/test/factories/story.factory.ts:1-29`
- `apps/backend/test/factories/tag.factory.ts:1-24`
- `apps/backend/test/factories/persona.factory.ts:1-24`
- `apps/backend/test/factories/comment.factory.ts:1-29`
- `apps/backend/test/factories/index.ts:1-8` - Re-exports

### Test Files Created
- `apps/backend/test/health.e2e-spec.ts:1-28` - Smoke test
- `apps/backend/test/auth.e2e-spec.ts:1-281` - 15 authentication tests (ALL PASSING)

### Bug Fixes Applied
- `apps/backend/test/helpers/auth.ts:1` - Changed `import * as request` to `import request from 'supertest'`
- `apps/backend/test/helpers/test-app.ts:19` - Added `app.setGlobalPrefix('api')` to match production
- `apps/backend/test/helpers/auth-cleanup.ts:13-37` - Implemented lazy initialization for Supabase admin client
- `apps/backend/test/auth.e2e-spec.ts:194-197` - Fixed profile assertion (API returns user directly, not wrapped)
- `apps/backend/test/auth.e2e-spec.ts:88-91` - Handle array/string message formats
- Multiple status code fixes: Changed expected 200 to 201 for login and logout endpoints

## Learnings

### Critical Infrastructure Patterns

1. **Global Prefix Required in Tests** (`test/helpers/test-app.ts:19`)
   - Production uses `app.setGlobalPrefix('api')`
   - Tests MUST replicate this or all routes return 404
   - Symptom: All endpoints return 404 even though they exist

2. **Supertest Import Format** (`test/helpers/auth.ts:1`)
   - Use: `import request from 'supertest'` (default import)
   - NOT: `import * as request from 'supertest'` (namespace import)
   - TypeScript error: `TS2349: This expression is not callable`

3. **Lazy Initialization for Environment Variables** (`test/helpers/auth-cleanup.ts:13-37`)
   - Don't initialize Supabase client at module load time
   - Environment variables from `.env.test` aren't loaded yet
   - Use lazy initialization pattern: create client on first use
   - **Root Cause**: Module imports happen before `dotenv.config()` runs in `setup.ts`

4. **Compiled File Cache Issues** (`dist/**`)
   - Stale compiled `.js` files can cause mysterious 500 errors
   - Symptom: `Cannot read properties of undefined (reading 'url')`
   - Solution: Clean all compiled files and rebuild when source changes
   - Commands: `rm -rf apps/backend/dist && pnpm build`

### API Response Patterns

5. **Profile Endpoint Returns User Directly** (`src/modules/auth/auth.controller.ts:profile`)
   - Response: `{ id, email, ... }` (user object directly)
   - NOT: `{ user: { id, email, ... } }` (wrapped in user property)
   - Test assertion must match actual API response structure

6. **Login/Logout Return 201, Not 200** (`src/modules/auth/auth.controller.ts`)
   - POST `/api/auth/login` returns 201 Created
   - POST `/api/auth/logout` returns 201 Created
   - Tests must expect 201, not 200

7. **Validation Messages Can Be Arrays** (`test/auth.e2e-spec.ts:88-91`)
   - NestJS ValidationPipe can return `{ message: string[] }` or `{ message: string }`
   - Always handle both formats in test assertions
   - Pattern: `const message = Array.isArray(response.body.message) ? response.body.message.join(' ') : response.body.message`

### Supabase Auth Setup

8. **Service Role Key Location** (Supabase Dashboard)
   - Navigate to: Settings → API Keys
   - New format (2025): `sb_secret_...` (not `service_role`)
   - Required for `auth.admin.deleteUser()` functionality
   - Safe for server-side use, never expose in browser

9. **Auth Users Persist Independently** (`test/helpers/auth-cleanup.ts`)
   - Database table cleanup does NOT delete Supabase Auth users
   - Must use `auth.admin.deleteUser()` with service_role key
   - Without cleanup: users accumulate and tests may interfere with each other

### Test Performance

10. **Test Timing** (15 tests in ~22 seconds)
    - Average: ~1.5 seconds per test
    - Includes database reset and auth cleanup before each test
    - Supabase network latency is acceptable for E2E tests
    - No optimization needed at current scale

## Artifacts

### Documentation
- `docs/E2E_TESTING_STRATEGY.md` - Complete testing strategy document

### Configuration
- `apps/backend/.env.test` - Test environment with Supabase credentials
- `apps/backend/test/jest-e2e.json` - Jest configuration for E2E tests
- `apps/backend/package.json` - Updated with test scripts

### Test Infrastructure (26 files total)
- `apps/backend/test/setup.ts` - Global setup with cleanup hooks
- `apps/backend/test/helpers/` - 5 helper files
- `apps/backend/test/fixtures/` - 8 fixture files + index
- `apps/backend/test/factories/` - 7 factory files + index

### Completed Tests
- `apps/backend/test/health.e2e-spec.ts` - 1 smoke test
- `apps/backend/test/auth.e2e-spec.ts` - 15 authentication tests (ALL PASSING)

## Action Items & Next Steps

### Immediate Next Steps (Tier 1 Tests - 44 remaining)

Based on `docs/E2E_TESTING_STRATEGY.md`, implement the following in priority order:

1. **Journeys CRUD** (7 tests) - `test/journeys.e2e-spec.ts`
   - POST /api/journeys (create with sort_order)
   - GET /api/journeys (list all)
   - GET /api/journeys/:id (get by ID)
   - PATCH /api/journeys/:id (update)
   - DELETE /api/journeys/:id (cascade delete)
   - PATCH /api/journeys/:id/reorder (reorder)
   - GET /api/journeys with search/filter

2. **Steps CRUD** (7 tests) - `test/steps.e2e-spec.ts`
   - POST /api/steps (create with journey_id)
   - GET /api/journeys/:id/steps (list by journey)
   - GET /api/steps/:id (get by ID)
   - PATCH /api/steps/:id (update)
   - DELETE /api/steps/:id (cascade delete)
   - PATCH /api/steps/:id/reorder (reorder)
   - POST /api/steps with validation

3. **Releases CRUD** (8 tests) - `test/releases.e2e-spec.ts`
   - POST /api/releases (create)
   - GET /api/releases (list all)
   - GET /api/releases/:id (get by ID)
   - PATCH /api/releases/:id (update)
   - DELETE /api/releases/:id (move stories to Unassigned)
   - PATCH /api/releases/:id/reorder (reorder)
   - Prevent deleting Unassigned release
   - GET /api/releases/:id/stats (story count)

4. **Stories CRUD** (9 tests) - `test/stories.e2e-spec.ts`
   - POST /api/stories (create in cell)
   - GET /api/stories (filter by step_id + release_id)
   - GET /api/stories/:id (get by ID with dependencies)
   - PATCH /api/stories/:id (update)
   - DELETE /api/stories/:id (cleanup dependencies)
   - PATCH /api/stories/:id/move (move to new cell)
   - PATCH /api/stories/:id/reorder (reorder within cell)
   - POST /api/stories with tags/personas
   - GET /api/stories with full expansion

5. **Tags CRUD** (6 tests) - `test/tags.e2e-spec.ts`
   - POST /api/tags (create)
   - GET /api/tags (list all)
   - GET /api/tags/:id (get by ID)
   - DELETE /api/tags/:id (cascade remove from stories)
   - POST /api/stories/:id/tags/:tagId (add tag)
   - DELETE /api/stories/:id/tags/:tagId (remove tag)

6. **Personas CRUD** (7 tests) - `test/personas.e2e-spec.ts`
   - POST /api/personas (create)
   - GET /api/personas (list all)
   - GET /api/personas/:id (get by ID)
   - PATCH /api/personas/:id (update)
   - DELETE /api/personas/:id (cascade remove from stories)
   - POST /api/stories/:id/personas/:personaId (add persona)
   - DELETE /api/stories/:id/personas/:personaId (remove persona)

7. **Comments CRUD** (6 tests) - `test/comments.e2e-spec.ts`
   - POST /api/stories/:id/comments (create with auth user)
   - GET /api/stories/:id/comments (list with is_current_user flag)
   - PATCH /api/comments/:id (update own comment)
   - DELETE /api/comments/:id (delete own comment)
   - Prevent editing other user's comments
   - Prevent deleting other user's comments

### Testing Pattern to Follow

For each test file:
1. Use `createTestApp()` helper
2. Use `createAuthToken()` to get JWT for protected routes
3. Use fixtures for test data (already created)
4. Use factories to create entities via API (already created)
5. Follow existing patterns from `auth.e2e-spec.ts`
6. Test both success and error cases
7. Verify relationships and cascade operations

### Future Work (Tier 2 - 37 tests)

After Tier 1 is complete, implement complex workflow tests:
- Story dependency management
- Cascade delete operations
- Reorder operations across boundaries
- Story movement between cells
- Multi-entity workflows

## Other Notes

### Project Structure
- Backend location: `apps/backend/`
- Test files location: `apps/backend/test/`
- Source code: `apps/backend/src/`
- Running backend: `pnpm start:dev` (runs on port 3000)

### Running Tests
```bash
# Run all E2E tests
pnpm test:e2e

# Run specific test file
pnpm test:e2e auth.e2e-spec

# Run with coverage
pnpm test:e2e:cov

# Run Tier 1 tests only
pnpm test:e2e:tier1

# Run in watch mode
pnpm test:e2e:watch
```

### Database Cleanup Pattern
The `beforeEach` hook in `test/setup.ts` runs before EVERY test:
```typescript
beforeEach(async () => {
  await resetDatabase();       // Clean all tables
  await deleteAllTestUsers();  // Clean Supabase Auth users
}, 30000);
```

This ensures complete test isolation but adds ~1-2 seconds per test.

### Key Files to Reference
- Authentication implementation: `apps/backend/src/modules/auth/`
- Other CRUD modules: `apps/backend/src/modules/`
- Prisma schema: `apps/backend/prisma/schema.prisma`
- BaseService pattern: `apps/backend/src/common/base.service.ts`

### Debugging Tips
1. If tests fail with 404: Check global prefix in test-app.ts
2. If tests fail with 500: Check for stale compiled files in dist/
3. If auth users accumulate: Verify SUPABASE_SERVICE_ROLE_KEY in .env.test
4. If validation errors: Check actual API response format vs expected

### Success Criteria for Next Phase
- All Tier 1 tests passing (59 total: 15 auth + 44 CRUD)
- No skipped or pending tests
- Clean test output (no warnings)
- Test execution time under 2 minutes for full Tier 1 suite
- All tests using proper fixtures and factories (no hardcoded data)
