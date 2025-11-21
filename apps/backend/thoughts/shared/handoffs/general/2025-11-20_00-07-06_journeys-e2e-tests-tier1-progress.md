---
date: 2025-11-20T00:07:06+0000
researcher: claude-sonnet-4-5
git_commit: 1b607b12a738a5d3173f13212d99a829c028890e
branch: main
repository: user-story-mapping-tool
topic: "E2E Testing - Tier 1 Journeys CRUD Complete + Exception Filter Implementation"
tags: [testing, e2e, journeys, exception-handling, tier1, jest, infrastructure]
status: in_progress
last_updated: 2025-11-20
last_updated_by: claude-sonnet-4-5
type: implementation_strategy
---

# Handoff: Tier 1 E2E Tests - Journeys CRUD Complete (12/12 passing)

## Task(s)

**Status: IN PROGRESS** (Tier 1 - 47% complete)

From handoff: `thoughts/shared/handoffs/general/2025-11-19_23-21-35_e2e-auth-tests-complete.md`

**Completed in this session:**
1. ✅ **Fixed health.e2e-spec.ts bug** - Profile endpoint returns user directly, not wrapped in `user` property
2. ✅ **Created AllExceptionsFilter** - Global exception filter to map domain errors to HTTP status codes
3. ✅ **Implemented Journeys CRUD E2E tests** - All 12 tests passing (7 originally planned, expanded to 12)

**Current Tier 1 status:**
- Health: 4 tests (3 passing, 1 failing - auth token creation issue)
- Auth: 18 tests (14 passing, 4 failing - exception filter being too aggressive)
- Journeys: 12 tests (12 passing) ✅ **NEW**

**Total: ~28/59 Tier 1 tests, but 5 currently broken due to exception filter issue**

**Remaining Tier 1 modules:**
- Steps CRUD (7 tests)
- Releases CRUD (8 tests)
- Stories CRUD (9 tests)
- Tags CRUD (6 tests)
- Personas CRUD (7 tests)
- Comments CRUD (6 tests)

## Critical References

- `docs/DATA_MODEL_COMPREHENSIVE.md` - Complete API specification (read fully this session)
- `docs/DATA_MODEL_QUICK_REFERENCE.md` - Quick API reference
- `docs/E2E_TESTING_STRATEGY.md` - Testing strategy with tier breakdown

## Recent Changes

### Bug Fixes
- `test/health.e2e-spec.ts:67-69` - Fixed profile endpoint assertion (expects `response.body.id` not `response.body.user`)

### Infrastructure Improvements
- `src/common/filters/all-exceptions.filter.ts:1-64` - **NEW FILE** - Global exception filter that catches all errors and maps to HTTP status codes
  - Maps "not found" → 404
  - Maps "required"/"invalid"/"must be" → 400
  - Maps "already exists" → 409
  - Maps "unauthorized" → 401
  - Maps "forbidden" → 403
- `src/main.ts:5,24` - Updated to use `AllExceptionsFilter` instead of `HttpExceptionFilter`
- `test/helpers/test-app.ts:4,32` - Added `AllExceptionsFilter` to test app (matches production config)

### New Test Files
- `test/journeys.e2e-spec.ts:1-286` - **NEW FILE** - Complete Journeys CRUD E2E tests (12 tests)
  - POST /api/journeys - create, auth validation, input validation
  - GET /api/journeys - list all, sorted by sort_order, empty array
  - GET /api/journeys/:id - get by ID, 404 for non-existent
  - PATCH /api/journeys/:id - update name, update color, 404 for non-existent
  - DELETE /api/journeys/:id - delete, verify cascade, 404 for non-existent

## Learnings

### Critical Bug Identified
**AllExceptionsFilter is too aggressive** (`src/common/filters/all-exceptions.filter.ts:29-43`)
- Currently maps any error containing "required"/"invalid" to 400 Bad Request
- This is catching Supabase Auth validation errors and incorrectly transforming them
- **Symptom:** Auth tests failing with "expected 201 'Created', got 400 'Bad Request'"
- **4 auth tests now broken:**
  - "should reject duplicate email" - `test/auth.e2e-spec.ts:62`
  - "should reject invalid credentials" - `test/auth.e2e-spec.ts:161`
  - Profile test - `test/auth.e2e-spec.ts:183`
  - Logout test - `test/auth.e2e-spec.ts:267`
- **Fix needed:** Filter should only transform errors from our domain (JourneyError, ReleaseError, etc.), not Supabase errors

### Pattern Discoveries

1. **Direct request() pattern required** (`test/journeys.e2e-spec.ts`)
   - Don't use `authenticatedRequest()` helper (has supertest import issues)
   - Use: `request(app.getHttpServer()).set('Authorization', \`Bearer ${token}\`)`
   - This matches the pattern in `test/auth.e2e-spec.ts`

2. **Test app must match production** (`test/helpers/test-app.ts:32`)
   - Must apply same global filters as main.ts
   - Must apply same validation pipes
   - Must apply same global prefix (`/api`)
   - Otherwise tests won't catch production issues

3. **API field naming is snake_case** (confirmed from docs)
   - `sort_order`, `created_at`, `updated_at`, `step_id`, `release_id`
   - DTOs use snake_case to match API contract
   - Prisma uses camelCase internally (services transform between layers)

4. **Journey sort_order uses 0-based increment** (not 1000-based like Stories)
   - Stories: 1000, 2000, 3000... (allows insertion without reorder)
   - Journeys/Steps/Releases: 0, 1, 2, 3... (simple sequential)

## Artifacts

### Test Files Created
- `test/journeys.e2e-spec.ts` - 12 Journeys CRUD tests (all passing)

### Infrastructure Files
- `src/common/filters/all-exceptions.filter.ts` - Global exception filter (needs refinement)

### Modified Files
- `test/health.e2e-spec.ts` - Fixed profile assertion
- `test/helpers/test-app.ts` - Added exception filter
- `src/main.ts` - Updated to use AllExceptionsFilter

### Documentation Read
- `docs/DATA_MODEL_COMPREHENSIVE.md` - Full API specification (1702 lines)
- `docs/DATA_MODEL_QUICK_REFERENCE.md` - Quick reference (505 lines)

## Action Items & Next Steps

### Immediate Priority (Fix Broken Tests)

1. **Fix AllExceptionsFilter to not intercept Supabase errors**
   - Option A: Check error type/name before transforming (only transform domain errors)
   - Option B: Make filter more selective about which messages to map
   - Option C: Have auth controller/service catch and re-throw as HttpException
   - **Goal:** Get all 18 auth tests passing again

2. **Verify all tests pass together**
   - Run `pnpm test:e2e` and confirm 31/31 passing
   - Current status: 23/31 passing (8 failing due to exception filter)

### Continue Tier 1 Implementation

3. **Implement Steps CRUD E2E tests** (7 tests)
   - Follow same pattern as journeys.e2e-spec.ts
   - Use existing fixtures: `test/fixtures/step.fixture.ts`
   - Use existing factory: `test/factories/step.factory.ts`
   - Test endpoints per `docs/DATA_MODEL_COMPREHENSIVE.md:189-201`

4. **Implement Releases CRUD E2E tests** (8 tests)
   - **CRITICAL:** Test Unassigned release special handling
   - Test that deleting release moves stories to Unassigned (soft cascade)
   - Test preventing deletion of Unassigned release

5. **Continue with remaining Tier 1 modules**
   - Stories CRUD (9 tests) - Most complex (dependencies, 1000-based sort_order)
   - Tags CRUD (6 tests)
   - Personas CRUD (7 tests)
   - Comments CRUD (6 tests) - Requires JWT extraction testing

## Other Notes

### Test Execution Commands

```bash
# Run all E2E tests
pnpm test:e2e

# Run specific test file
pnpm test:e2e journeys.e2e-spec

# Run Tier 1 tests only (when script exists)
pnpm test:e2e:tier1
```

### Key File Locations

**Test Infrastructure:**
- `test/helpers/` - 5 helper files (test-app, auth, database, auth-cleanup, unique)
- `test/fixtures/` - 8 fixture files + index (journey, step, release, story, tag, persona, comment, user)
- `test/factories/` - 7 factory files + index (HTTP entity creators)
- `test/setup.ts` - Global test setup with database cleanup hooks

**Source Code:**
- `src/modules/journeys/` - Journey module (controller, service, DTOs, errors)
- `src/modules/auth/` - Auth module
- `src/common/filters/` - Exception filters
- `src/common/base.service.ts` - Base service with error handling

**API Documentation:**
- Endpoints documented in `docs/DATA_MODEL_COMPREHENSIVE.md:1317-1400`
- Journeys: GET, POST, PATCH, DELETE + POST /journeys/:id/reorder

### Success Criteria for Next Session

- ✅ All auth tests passing (18/18)
- ✅ All health tests passing (4/4)
- ✅ All journey tests passing (12/12) - already achieved
- ✅ Steps CRUD tests implemented and passing (7/7)
- 🎯 Total: ~41/59 Tier 1 tests passing (70% of Tier 1)

### Testing Pattern to Follow

All test files should:
1. Use `createTestApp()` helper - `test/helpers/test-app.ts`
2. Use direct `request(app.getHttpServer()).set('Authorization', ...)` pattern
3. Use fixtures for test data - `test/fixtures/*.fixture.ts`
4. Create auth token fresh for each test - `beforeEach(() => createAuthToken(app))`
5. Trust global database cleanup - configured in `test/setup.ts`
6. Follow existing patterns from `test/journeys.e2e-spec.ts` and `test/auth.e2e-spec.ts`

### Exception Filter Issue Details

The current filter logic (`src/common/filters/all-exceptions.filter.ts:29-43`) is:
```typescript
if (lowerMessage.includes('not found')) {
  status = HttpStatus.NOT_FOUND;
} else if (
  lowerMessage.includes('required') ||
  lowerMessage.includes('invalid') ||
  lowerMessage.includes('must be')
) {
  status = HttpStatus.BAD_REQUEST; // ← TOO AGGRESSIVE
}
```

This catches legitimate Supabase validation errors and maps them incorrectly. Need to either:
1. Check `exception.constructor.name` for domain error types
2. Only transform errors that extend our base domain error class
3. Use a whitelist approach instead of string matching
