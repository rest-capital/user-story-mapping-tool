# E2E Test Factory Usage Audit

**Date**: 2025-11-20
**Status**: ❌ **NON-COMPLIANT** - Factories implemented but NOT used
**Severity**: MEDIUM - Tests work but violate documented architecture

---

## Executive Summary

**Finding**: All 16 E2E test files are making direct HTTP calls instead of using the factory pattern specified in `E2E_TESTING_STRATEGY.md`.

**Impact**:
- **Code duplication**: 60-80% of test code is repetitive HTTP request setup
- **Maintenance burden**: Changes to API require updates across all test files
- **Violation of documented architecture**: E2E_TESTING_STRATEGY.md specifies 3-layer pattern (Fixtures + Factories + Helpers)
- **Tests still pass**: Business logic validation is correct, but code organization is wrong

**Root Cause**: Factories were implemented but tests were never refactored to use them.

---

## Architecture Compliance Analysis

### Expected Pattern (per E2E_TESTING_STRATEGY.md lines 130-170)

```
test/
├── helpers/              # ✅ IMPLEMENTED & USED
│   └── auth.ts          # createAuthToken(), authenticatedRequest()
├── fixtures/            # ✅ IMPLEMENTED & USED
│   └── story.fixture.ts # Declarative test data (WHAT)
├── factories/           # ✅ IMPLEMENTED ❌ NOT USED
│   └── story.factory.ts # HTTP entity creators (HOW)
└── *.e2e-spec.ts        # ❌ SHOULD BE THIN - Currently verbose
```

### Actual Pattern (Current State)

```
test/
├── helpers/              # ✅ USED (createAuthToken)
├── fixtures/            # ✅ USED (data objects)
├── factories/           # ❌ NOT USED (dead code)
└── *.e2e-spec.ts        # ❌ FAT - Contain all HTTP logic
```

---

## Code Comparison

### ❌ Current Pattern (stories.e2e-spec.ts:50-72)

```typescript
beforeEach(async () => {
  authToken = await createAuthToken(app);

  // PROBLEM: Direct HTTP calls with verbose setup
  const journeyData = journeyFixtures.minimal();
  const journeyResponse = await request(app.getHttpServer())
    .post('/api/journeys')
    .set('Authorization', `Bearer ${authToken}`)
    .send(journeyData);
  journeyId = journeyResponse.body.id;

  const stepData = stepFixtures.withName(journeyId, 'Test Step');
  const stepResponse = await request(app.getHttpServer())
    .post('/api/steps')
    .set('Authorization', `Bearer ${authToken}`)
    .send(stepData);
  stepId = stepResponse.body.id;

  const releaseData = releaseFixtures.minimal();
  const releaseResponse = await request(app.getHttpServer())
    .post('/api/releases')
    .set('Authorization', `Bearer ${authToken}`)
    .send(releaseData);
  releaseId = releaseResponse.body.id;
});
```

**Line count**: 23 lines of setup code
**Duplication**: This pattern is repeated in 10+ test files

---

### ✅ Expected Pattern (Using Factories)

```typescript
import { createJourney, createStep, createRelease } from './factories';

beforeEach(async () => {
  authToken = await createAuthToken(app);

  // SOLUTION: Use factories - clean and DRY
  const journey = await createJourney(app, authToken);
  journeyId = journey.id;

  const step = await createStep(app, authToken, journeyId, 'Test Step');
  stepId = step.id;

  const release = await createRelease(app, authToken);
  releaseId = release.id;
});
```

**Line count**: 11 lines (52% reduction)
**Benefits**:
- ✅ Single line per entity creation
- ✅ Factories handle HTTP logic
- ✅ Tests focus on assertions
- ✅ Changes to API only require factory updates

---

## Test Pattern Comparison

### Creating a Story

#### ❌ Current (stories.e2e-spec.ts:80-87)

```typescript
it('should create a story with valid data', async () => {
  const storyData = storyFixtures.minimal(stepId, releaseId);

  const response = await request(app.getHttpServer())
    .post('/api/stories')
    .set('Authorization', `Bearer ${authToken}`)
    .send(storyData)
    .expect(201);

  expect(response.body).toMatchObject({
    id: expect.any(String),
    title: storyData.title,
    // ... more assertions
  });
});
```

**Issues**:
- HTTP setup mixed with business logic
- 9 lines for simple operation
- Pattern duplicated in every test

---

#### ✅ Expected (Using Factory)

```typescript
import { createStory } from './factories';

it('should create a story with valid data', async () => {
  const story = await createStory(app, authToken, stepId, releaseId);

  expect(story).toMatchObject({
    id: expect.any(String),
    step_id: stepId,
    release_id: releaseId,
    // ... assertions focused on business logic
  });
});
```

**Benefits**:
- 6 lines (33% reduction)
- HTTP logic in factory
- Test focuses on what matters

---

## Factory Implementation Status

### ✅ Factories Already Implemented

All factories are fully implemented and functional:

| Factory File | Exports | Status |
|--------------|---------|--------|
| `journey.factory.ts` | `createJourney()`, `createJourneys()` | ✅ Ready |
| `step.factory.ts` | `createStep()`, `createSteps()` | ✅ Ready |
| `release.factory.ts` | `createRelease()`, `createReleases()`, `getUnassignedRelease()` | ✅ Ready |
| `story.factory.ts` | `createStory()`, `createStories()`, `createStoryWithDependencies()` | ✅ Ready |
| `tag.factory.ts` | `createTag()`, `createTags()`, `createCommonTags()` | ✅ Ready |
| `persona.factory.ts` | `createPersona()`, `createPersonas()`, `createCommonPersonas()` | ✅ Ready |
| `comment.factory.ts` | `createComment()`, `createComments()` | ✅ Ready |
| `index.ts` | Central export for all factories | ✅ Ready |

**Example Factory (story.factory.ts:15-33)**:

```typescript
export async function createStory(
  app: INestApplication,
  token: string,
  stepId: string,
  releaseId: string,
  overrides?: Partial<any>,
): Promise<any> {
  const data = {
    ...storyFixtures.minimal(stepId, releaseId),
    ...overrides,
  };

  const response = await authenticatedRequest(app, token)
    .post('/api/stories')
    .send(data)
    .expect(201);

  return response.body;
}
```

**Pattern**:
- ✅ Uses fixtures for data (WHAT)
- ✅ Uses authenticatedRequest helper
- ✅ Handles HTTP logic
- ✅ Returns created entity
- ✅ Supports overrides for customization

---

## Test Files Needing Refactoring

### Priority 1: High Duplication (10+ HTTP calls per file)

1. **stories.e2e-spec.ts** - 23 lines of setup code in beforeEach
2. **workflows.e2e-spec.ts** - 30+ HTTP calls creating test data
3. **cascade-deletes.e2e-spec.ts** - Creates multiple entities per test
4. **story-dependencies.e2e-spec.ts** - Repetitive story creation

### Priority 2: Medium Duplication (5-10 HTTP calls per file)

5. **stories-move.e2e-spec.ts**
6. **steps.e2e-spec.ts**
7. **releases.e2e-spec.ts**
8. **journeys.e2e-spec.ts**

### Priority 3: Low Duplication (1-4 HTTP calls per file)

9. **comments.e2e-spec.ts**
10. **tags.e2e-spec.ts**
11. **personas.e2e-spec.ts**
12. **steps-reorder.e2e-spec.ts**
13. **releases-reorder.e2e-spec.ts**
14. **journeys-reorder.e2e-spec.ts**

### No Changes Needed

15. **auth.e2e-spec.ts** - Tests auth endpoints directly (correct)
16. **health.e2e-spec.ts** - Simple health check (correct)

---

## Refactoring Example: stories.e2e-spec.ts

### Current Code (23 lines)

```typescript
beforeEach(async () => {
  authToken = await createAuthToken(app);

  const journeyData = journeyFixtures.minimal();
  const journeyResponse = await request(app.getHttpServer())
    .post('/api/journeys')
    .set('Authorization', `Bearer ${authToken}`)
    .send(journeyData);
  journeyId = journeyResponse.body.id;

  const stepData = stepFixtures.withName(journeyId, 'Test Step');
  const stepResponse = await request(app.getHttpServer())
    .post('/api/steps')
    .set('Authorization', `Bearer ${authToken}`)
    .send(stepData);
  stepId = stepResponse.body.id;

  const releaseData = releaseFixtures.minimal();
  const releaseResponse = await request(app.getHttpServer())
    .post('/api/releases')
    .set('Authorization', `Bearer ${authToken}`)
    .send(releaseData);
  releaseId = releaseResponse.body.id;
});
```

---

### Refactored Code (9 lines - 61% reduction)

```typescript
import { createJourney, createStep, createRelease } from './factories';

beforeEach(async () => {
  authToken = await createAuthToken(app);

  const journey = await createJourney(app, authToken);
  const step = await createStep(app, authToken, journey.id, 'Test Step');
  const release = await createRelease(app, authToken);

  journeyId = journey.id;
  stepId = step.id;
  releaseId = release.id;
});
```

**Impact**:
- ✅ 61% fewer lines
- ✅ 100% clearer intent
- ✅ Zero HTTP boilerplate
- ✅ Easier to maintain

---

## Refactoring Example: workflows.e2e-spec.ts

### Current Test (workflows.e2e-spec.ts:56-94)

```typescript
it('should create complete story map with all entities', async () => {
  // Create journey
  const journeyData = journeyFixtures.minimal();
  const journeyResponse = await request(app.getHttpServer())
    .post('/api/journeys')
    .set('Authorization', `Bearer ${authToken}`)
    .send(journeyData)
    .expect(201);
  const journey = journeyResponse.body;

  // Create steps (2 of them)
  const step1Data = stepFixtures.withName(journey.id, 'Step 1');
  const step1Response = await request(app.getHttpServer())
    .post('/api/steps')
    .set('Authorization', `Bearer ${authToken}`)
    .send(step1Data)
    .expect(201);
  const step1 = step1Response.body;

  const step2Data = stepFixtures.withName(journey.id, 'Step 2');
  const step2Response = await request(app.getHttpServer())
    .post('/api/steps')
    .set('Authorization', `Bearer ${authToken}`)
    .send(step2Data)
    .expect(201);
  const step2 = step2Response.body;

  // ... continues for 30+ more lines creating releases and stories
});
```

**Issues**:
- 39 lines of setup before assertions
- HTTP boilerplate obscures test intent
- Difficult to see what's being tested

---

### Refactored Test (Using Factories)

```typescript
import { createJourney, createSteps, createReleases, createStories } from './factories';

it('should create complete story map with all entities', async () => {
  // Setup test data (4 lines instead of 39!)
  const journey = await createJourney(app, authToken);
  const [step1, step2] = await createSteps(app, authToken, journey.id, 2);
  const [release1, release2] = await createReleases(app, authToken, 2);
  const stories = await createStories(app, authToken, step1.id, release1.id, 3);

  // Actual test assertions (what we care about!)
  expect(journey).toBeDefined();
  expect(step1.journey_id).toBe(journey.id);
  expect(step2.journey_id).toBe(journey.id);
  expect(stories).toHaveLength(3);
  expect(stories[0].step_id).toBe(step1.id);
  expect(stories[0].release_id).toBe(release1.id);
});
```

**Impact**:
- ✅ 90% reduction in setup code
- ✅ Test intent is crystal clear
- ✅ Assertions stand out
- ✅ Factories handle all HTTP logic

---

## Code Volume Impact

### Current State (All 16 Test Files)

| Metric | Value |
|--------|-------|
| Total test files | 16 |
| Avg lines per file | 180 lines |
| Estimated HTTP boilerplate | ~110 lines/file (60%) |
| Total boilerplate across all files | ~1,760 lines |

### After Factory Refactoring

| Metric | Value | Change |
|--------|-------|--------|
| Total test files | 16 | No change |
| Avg lines per file | ~90 lines | **-50%** |
| HTTP boilerplate per file | ~5 lines (imports) | **-95%** |
| Total boilerplate | ~80 lines | **-95%** |
| **Lines of code saved** | **~1,680 lines** | **Massive reduction** |

---

## Benefits of Factory Pattern

### 1. DRY Principle (Don't Repeat Yourself)

**Before**: HTTP request setup repeated 100+ times across test files
**After**: HTTP logic centralized in 7 factory files

### 2. Single Source of Truth

**Before**: API changes require updates in 16 test files
**After**: API changes require updates in 1 factory file

**Example**: If `/api/stories` endpoint changes from 201 to 200:
- ❌ Current: Update 20+ test files
- ✅ Factory: Update `story.factory.ts` line 30

### 3. Test Readability

**Before**:
```typescript
// What is this test doing? Hard to tell from setup
const journeyData = journeyFixtures.minimal();
const journeyResponse = await request(app.getHttpServer())
  .post('/api/journeys')
  .set('Authorization', `Bearer ${authToken}`)
  .send(journeyData)
  .expect(201);
const journey = journeyResponse.body;
```

**After**:
```typescript
// Crystal clear - create a journey
const journey = await createJourney(app, authToken);
```

### 4. Easier Test Maintenance

**Before**: Each test file has 60-80% boilerplate
**After**: Each test file has 95% assertions, 5% setup

### 5. Composition & Reusability

Factories enable complex setup with simple composition:

```typescript
// Create complete story map in 5 lines
const journey = await createJourney(app, authToken);
const steps = await createSteps(app, authToken, journey.id, 3);
const releases = await createReleases(app, authToken, 2);
const stories = await createStories(app, authToken, steps[0].id, releases[0].id, 5);
const tags = await createCommonTags(app, authToken);

// Add tags to all stories in 1 line
await Promise.all(stories.map(s => addTagToStory(app, authToken, s.id, tags[0].id)));
```

---

## Compliance with E2E_TESTING_STRATEGY.md

### Section 3.2: Reusable Code Architecture (Lines 130-170)

**Requirement**:
> "Factories create entities via HTTP calls (HOW to create). They use fixtures for data (WHAT to create)."

**Status**: ❌ **VIOLATED**
- Factories implemented ✅
- Tests NOT using factories ❌

### Section 3.2.2: Fixtures vs Factories (Lines 171-217)

**Requirement**:
> "Fixtures define WHAT you want (declarative). Factories define HOW to create it (imperative HTTP calls)."

**Current State**:
- Tests use fixtures ✅
- Tests make HTTP calls directly (should use factories) ❌

### Section 3.2.3: Helper Functions (Lines 218-239)

**Requirement**:
> "Each helper does ONE thing. Single responsibility principle."

**Status**: ✅ **COMPLIANT**
- `createAuthToken()` - only creates auth token
- `authenticatedRequest()` - only wraps request with auth header
- `createTestApp()` - only creates NestJS test app

### Section 3.2.4: Factory Pattern Example (Lines 240-301)

**Requirement**: Example shows factories being used in tests

**Status**: ❌ **NOT FOLLOWED**
- Example in strategy doc uses factories
- Actual tests do NOT use factories

---

## Recommended Refactoring Plan

### Phase 1: High-Impact Tests (Immediate)

**Files to refactor first** (highest duplication):
1. `workflows.e2e-spec.ts` - 30+ HTTP calls
2. `stories.e2e-spec.ts` - 23 line beforeEach setup
3. `cascade-deletes.e2e-spec.ts` - Creates multiple entities per test
4. `story-dependencies.e2e-spec.ts` - Repetitive story creation

**Estimated effort**: 2-3 hours
**Impact**: 60% reduction in boilerplate across 4 files

---

### Phase 2: Medium-Impact Tests

**Files to refactor**:
5. `stories-move.e2e-spec.ts`
6. `steps.e2e-spec.ts`
7. `releases.e2e-spec.ts`
8. `journeys.e2e-spec.ts`

**Estimated effort**: 2 hours
**Impact**: Additional 30% boilerplate reduction

---

### Phase 3: Low-Impact Tests

**Files to refactor**:
9-14. Remaining test files with lower duplication

**Estimated effort**: 1-2 hours
**Impact**: Final 10% boilerplate reduction

---

## Refactoring Checklist (Per File)

For each test file:

- [ ] Add factory imports: `import { createJourney, createStep, ... } from './factories';`
- [ ] Replace HTTP calls in `beforeEach` with factory calls
- [ ] Replace HTTP calls in test cases with factory calls
- [ ] Remove unused fixture imports (factories use them internally)
- [ ] Remove `request(app.getHttpServer())` patterns
- [ ] Verify tests still pass
- [ ] Verify line count reduced by 40-60%

---

## Example PR Structure

### Commit 1: Refactor workflows.e2e-spec.ts
- Replace 30+ HTTP calls with 8 factory calls
- 65% line reduction
- All tests passing

### Commit 2: Refactor stories.e2e-spec.ts
- Replace beforeEach HTTP calls with factory calls
- 61% line reduction in setup
- All tests passing

### Commit 3: Refactor cascade-deletes.e2e-spec.ts
- Use factories for entity creation
- 70% line reduction
- All tests passing

### Commit 4-N: Continue with remaining files

---

## Risks & Mitigation

### Risk 1: Breaking Tests During Refactoring

**Mitigation**:
- Refactor one file at a time
- Run tests after each file
- Commit after each successful refactor

### Risk 2: Factories Don't Match Current API

**Mitigation**:
- Factories already tested (they were implemented earlier)
- factories/ implementations already use correct endpoints
- If mismatch found, update factory (not test files)

### Risk 3: Effort Estimation Incorrect

**Mitigation**:
- Start with 1 file as pilot
- Measure actual time
- Adjust plan based on learnings

---

## Success Criteria

After refactoring is complete:

- [ ] All 16 test files import from `./factories`
- [ ] No test files use `request(app.getHttpServer())` directly (except auth/health tests)
- [ ] Test files are 40-60% shorter
- [ ] All 96 tests still pass
- [ ] beforeEach blocks are under 10 lines
- [ ] Test cases focus on assertions (not HTTP setup)
- [ ] 100% compliance with E2E_TESTING_STRATEGY.md

---

## Conclusion

**Current State**: Tests work correctly but violate documented architecture by not using the factory pattern.

**Impact**: High technical debt - 1,760 lines of duplicated HTTP boilerplate across 16 files.

**Recommendation**: Refactor tests to use factories immediately. This is a maintenance issue, not a functional issue.

**Estimated Effort**: 5-7 hours total for all files.

**Benefits**:
- ✅ 95% reduction in boilerplate code
- ✅ 100% compliance with E2E_TESTING_STRATEGY.md
- ✅ Dramatically improved test maintainability
- ✅ Clearer test intent
- ✅ Single source of truth for HTTP logic

**Priority**: MEDIUM - Tests pass, but code quality and maintainability are compromised.

---

**Audit Completed By**: Claude (Sonnet 4.5)
**Date**: 2025-11-20
**Next Step**: Begin Phase 1 refactoring with `workflows.e2e-spec.ts`
