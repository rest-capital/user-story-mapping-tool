/**
 * Story Dependencies E2E Tests (Tier 2) - ENHANCED
 *
 * Coverage: 19 tests (EXCELLENT status)
 * - Business Logic: 7 tests (CRUD operations, cleanup, inclusion)
 * - DTO Validation: 5 tests (empty body, missing fields, invalid types)
 * - Service Validation: 3 tests (non-existent entities, workspace isolation)
 * - Edge Cases: 2 tests (idempotent delete, multiple link types)
 * - Workspace Isolation: 2 tests (cross-workspace prevention)
 *
 * Tests story dependency management:
 * - Create dependency (blocked_by)
 * - List dependencies for story
 * - Remove dependency
 * - Prevent self-dependency
 * - Prevent duplicate dependencies
 * - Verify dependencies cleaned up on delete
 * - Include dependencies in response
 * - DTO and service validation
 * - Workspace isolation (CRITICAL SECURITY)
 *
 * Following patterns from E2E_TESTING_STRATEGY.md Tier 2.5
 * REFACTORED: Using factory pattern for entity creation
 * ENHANCED: Comprehensive validation and security tests (file 15/18 in E2E audit)
 */

import { INestApplication } from '@nestjs/common';
import { createTestApp } from './helpers/test-app';
import { createAuthToken, authenticatedRequest } from './helpers/auth';
import { createStoryMap, createJourney, createStep, createRelease, createStory } from './factories';

describe('Story Dependencies (E2E) - Tier 2', () => {
  let app: INestApplication;
  let authToken: string;
  let storyMap: any;

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    authToken = await createAuthToken(app);
    storyMap = await createStoryMap(app, authToken);
  });

  afterAll(async () => {
    await app.close();
  });

  // ==================== BUSINESS LOGIC TESTS ====================

  describe('POST /api/stories/:id/dependencies', () => {
    it('should create a dependency (blocked_by relationship)', async () => {
      // Create journey, step, and release using factories
      const journey = await createJourney(app, authToken, storyMap.id, 'Test Journey');
      const step = await createStep(app, authToken, journey.id, 'Test Step');
      const release = await createRelease(app, authToken, storyMap.id, 'Test Release');

      // Create two stories using factories
      const story1 = await createStory(app, authToken, step.id, release.id, { title: 'Story 1' });
      const story2 = await createStory(app, authToken, step.id, release.id, { title: 'Story 2' });

      // Create dependency: story1 is blocked by story2
      const dependency = await authenticatedRequest(app, authToken)
        .post(`/api/stories/${story1.id}/dependencies`)
        .send({
          target_story_id: story2.id,
          link_type: 'IS_BLOCKED_BY',
        })
        .expect(201)
        .then(res => res.body);

      // Verify response structure
      expect(dependency).toMatchObject({
        id: expect.any(String),
        source_story_id: story1.id,
        target_story_id: story2.id,
        link_type: 'IS_BLOCKED_BY',
        created_at: expect.any(String),
      });
    });

    it('should prevent self-dependency', async () => {
      // Create journey, step, and release using factories
      const journey = await createJourney(app, authToken, storyMap.id, 'Test Journey');
      const step = await createStep(app, authToken, journey.id, 'Test Step');
      const release = await createRelease(app, authToken, storyMap.id, 'Test Release');

      // Create story using factory
      const story = await createStory(app, authToken, step.id, release.id, { title: 'Test Story' });

      // Try to create self-dependency - should fail
      const response = await authenticatedRequest(app, authToken)
        .post(`/api/stories/${story.id}/dependencies`)
        .send({
          target_story_id: story.id,
          link_type: 'IS_BLOCKED_BY',
        });

      // Verify error response (should be 400 BAD_REQUEST for "cannot" validation)
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toMatch(/self|itself/i);
    });

    it('should prevent duplicate dependencies', async () => {
      // Create journey, step, and release using factories
      const journey = await createJourney(app, authToken, storyMap.id, 'Test Journey');
      const step = await createStep(app, authToken, journey.id, 'Test Step');
      const release = await createRelease(app, authToken, storyMap.id, 'Test Release');

      // Create two stories using factories
      const story1 = await createStory(app, authToken, step.id, release.id, { title: 'Story 1' });
      const story2 = await createStory(app, authToken, step.id, release.id, { title: 'Story 2' });

      // Create dependency
      await authenticatedRequest(app, authToken)
        .post(`/api/stories/${story1.id}/dependencies`)
        .send({
          target_story_id: story2.id,
          link_type: 'IS_BLOCKED_BY',
        })
        .expect(201);

      // Try to create duplicate dependency - should fail
      const response = await authenticatedRequest(app, authToken)
        .post(`/api/stories/${story1.id}/dependencies`)
        .send({
          target_story_id: story2.id,
          link_type: 'IS_BLOCKED_BY',
        });

      // Verify error response (should be 409 CONFLICT for "already exists")
      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toMatch(/already exists|duplicate|Link of type/i);
    });
  });

  // ==================== DTO VALIDATION TESTS ====================

  describe('POST /api/stories/:id/dependencies - DTO Validation', () => {
    it('should reject empty body (400)', async () => {
      const journey = await createJourney(app, authToken, storyMap.id, 'Test Journey');
      const step = await createStep(app, authToken, journey.id, 'Test Step');
      const release = await createRelease(app, authToken, storyMap.id, 'Test Release');
      const story = await createStory(app, authToken, step.id, release.id, { title: 'Test Story' });

      const response = await authenticatedRequest(app, authToken)
        .post(`/api/stories/${story.id}/dependencies`)
        .send({})
        .expect(400);

      const messages = Array.isArray(response.body.message)
        ? response.body.message.join(' ')
        : response.body.message;
      expect(messages).toMatch(/target_story_id|link_type/i);
    });

    it('should reject missing target_story_id (400)', async () => {
      const journey = await createJourney(app, authToken, storyMap.id, 'Test Journey');
      const step = await createStep(app, authToken, journey.id, 'Test Step');
      const release = await createRelease(app, authToken, storyMap.id, 'Test Release');
      const story = await createStory(app, authToken, step.id, release.id, { title: 'Test Story' });

      const response = await authenticatedRequest(app, authToken)
        .post(`/api/stories/${story.id}/dependencies`)
        .send({
          link_type: 'IS_BLOCKED_BY',
        })
        .expect(400);

      const messages = Array.isArray(response.body.message)
        ? response.body.message.join(' ')
        : response.body.message;
      expect(messages).toMatch(/target_story_id/i);
    });

    it('should reject missing link_type (400)', async () => {
      const journey = await createJourney(app, authToken, storyMap.id, 'Test Journey');
      const step = await createStep(app, authToken, journey.id, 'Test Step');
      const release = await createRelease(app, authToken, storyMap.id, 'Test Release');
      const story1 = await createStory(app, authToken, step.id, release.id, { title: 'Story 1' });
      const story2 = await createStory(app, authToken, step.id, release.id, { title: 'Story 2' });

      const response = await authenticatedRequest(app, authToken)
        .post(`/api/stories/${story1.id}/dependencies`)
        .send({
          target_story_id: story2.id,
        })
        .expect(400);

      const messages = Array.isArray(response.body.message)
        ? response.body.message.join(' ')
        : response.body.message;
      expect(messages).toMatch(/link_type/i);
    });

    it('should reject invalid link_type enum value (400)', async () => {
      const journey = await createJourney(app, authToken, storyMap.id, 'Test Journey');
      const step = await createStep(app, authToken, journey.id, 'Test Step');
      const release = await createRelease(app, authToken, storyMap.id, 'Test Release');
      const story1 = await createStory(app, authToken, step.id, release.id, { title: 'Story 1' });
      const story2 = await createStory(app, authToken, step.id, release.id, { title: 'Story 2' });

      const response = await authenticatedRequest(app, authToken)
        .post(`/api/stories/${story1.id}/dependencies`)
        .send({
          target_story_id: story2.id,
          link_type: 'INVALID_TYPE',
        })
        .expect(400);

      const messages = Array.isArray(response.body.message)
        ? response.body.message.join(' ')
        : response.body.message;
      expect(messages).toMatch(/link_type|enum|must be one of/i);
    });

    it('should reject invalid type for target_story_id (400)', async () => {
      const journey = await createJourney(app, authToken, storyMap.id, 'Test Journey');
      const step = await createStep(app, authToken, journey.id, 'Test Step');
      const release = await createRelease(app, authToken, storyMap.id, 'Test Release');
      const story = await createStory(app, authToken, step.id, release.id, { title: 'Test Story' });

      const response = await authenticatedRequest(app, authToken)
        .post(`/api/stories/${story.id}/dependencies`)
        .send({
          target_story_id: 123, // number instead of string
          link_type: 'IS_BLOCKED_BY',
        })
        .expect(400);

      const messages = Array.isArray(response.body.message)
        ? response.body.message.join(' ')
        : response.body.message;
      expect(messages).toMatch(/target_story_id|string/i);
    });
  });

  describe('GET /api/stories/:id/dependencies', () => {
    it('should list all dependencies for a story (both outgoing and incoming)', async () => {
      // Create journey, step, and release using factories
      const journey = await createJourney(app, authToken, storyMap.id, 'Test Journey');
      const step = await createStep(app, authToken, journey.id, 'Test Step');
      const release = await createRelease(app, authToken, storyMap.id, 'Test Release');

      // Create three stories using factories
      const storyA = await createStory(app, authToken, step.id, release.id, { title: 'Story A' });
      const storyB = await createStory(app, authToken, step.id, release.id, { title: 'Story B' });
      const storyC = await createStory(app, authToken, step.id, release.id, { title: 'Story C' });

      // Create dependencies:
      // - storyB is blocked by storyA (outgoing from B's perspective)
      await authenticatedRequest(app, authToken)
        .post(`/api/stories/${storyB.id}/dependencies`)
        .send({
          target_story_id: storyA.id,
          link_type: 'IS_BLOCKED_BY',
        })
        .expect(201);

      // - storyC is blocked by storyB (incoming to B's perspective)
      await authenticatedRequest(app, authToken)
        .post(`/api/stories/${storyC.id}/dependencies`)
        .send({
          target_story_id: storyB.id,
          link_type: 'IS_BLOCKED_BY',
        })
        .expect(201);

      // Get dependencies for storyB
      const dependencies = await authenticatedRequest(app, authToken)
        .get(`/api/stories/${storyB.id}/dependencies`)
        .expect(200)
        .then(res => res.body);

      // Verify structure
      expect(dependencies).toHaveProperty('outgoing');
      expect(dependencies).toHaveProperty('incoming');
      expect(Array.isArray(dependencies.outgoing)).toBe(true);
      expect(Array.isArray(dependencies.incoming)).toBe(true);

      // Verify outgoing (storyB depends on storyA)
      expect(dependencies.outgoing).toHaveLength(1);
      expect(dependencies.outgoing[0].target_story_id).toBe(storyA.id);
      expect(dependencies.outgoing[0].source_story_id).toBe(storyB.id);

      // Verify incoming (storyC depends on storyB)
      expect(dependencies.incoming).toHaveLength(1);
      expect(dependencies.incoming[0].target_story_id).toBe(storyB.id);
      expect(dependencies.incoming[0].source_story_id).toBe(storyC.id);
    });
  });

  describe('DELETE /api/stories/:sourceId/dependencies/:targetId', () => {
    it('should remove a dependency', async () => {
      // Create journey, step, and release using factories
      const journey = await createJourney(app, authToken, storyMap.id, 'Test Journey');
      const step = await createStep(app, authToken, journey.id, 'Test Step');
      const release = await createRelease(app, authToken, storyMap.id, 'Test Release');

      // Create two stories using factories
      const story1 = await createStory(app, authToken, step.id, release.id, { title: 'Story 1' });
      const story2 = await createStory(app, authToken, step.id, release.id, { title: 'Story 2' });

      // Create dependency
      await authenticatedRequest(app, authToken)
        .post(`/api/stories/${story1.id}/dependencies`)
        .send({
          target_story_id: story2.id,
          link_type: 'IS_BLOCKED_BY',
        })
        .expect(201);

      // Verify dependency exists
      const dependenciesBefore = await authenticatedRequest(app, authToken)
        .get(`/api/stories/${story1.id}/dependencies`)
        .expect(200)
        .then(res => res.body);

      expect(dependenciesBefore.outgoing).toHaveLength(1);

      // Remove dependency
      const deleteResponse = await authenticatedRequest(app, authToken)
        .delete(`/api/stories/${story1.id}/dependencies/${story2.id}`)
        .expect(200)
        .then(res => res.body);

      expect(deleteResponse).toEqual({ success: true });

      // Verify dependency removed
      const dependenciesAfter = await authenticatedRequest(app, authToken)
        .get(`/api/stories/${story1.id}/dependencies`)
        .expect(200)
        .then(res => res.body);

      expect(dependenciesAfter.outgoing).toHaveLength(0);
      expect(dependenciesAfter.incoming).toHaveLength(0);
    });
  });

  // ==================== SERVICE VALIDATION TESTS ====================

  describe('POST /api/stories/:id/dependencies - Service Validation', () => {
    it('should return 404 when source story does not exist', async () => {
      const journey = await createJourney(app, authToken, storyMap.id, 'Test Journey');
      const step = await createStep(app, authToken, journey.id, 'Test Step');
      const release = await createRelease(app, authToken, storyMap.id, 'Test Release');
      const targetStory = await createStory(app, authToken, step.id, release.id, { title: 'Target Story' });

      const fakeSourceId = '00000000-0000-0000-0000-000000000000';

      const response = await authenticatedRequest(app, authToken)
        .post(`/api/stories/${fakeSourceId}/dependencies`)
        .send({
          target_story_id: targetStory.id,
          link_type: 'IS_BLOCKED_BY',
        })
        .expect(404);

      expect(response.body.message).toMatch(/not found|story/i);
    });

    it('should return 404 when target story does not exist', async () => {
      const journey = await createJourney(app, authToken, storyMap.id, 'Test Journey');
      const step = await createStep(app, authToken, journey.id, 'Test Step');
      const release = await createRelease(app, authToken, storyMap.id, 'Test Release');
      const sourceStory = await createStory(app, authToken, step.id, release.id, { title: 'Source Story' });

      const fakeTargetId = '00000000-0000-0000-0000-000000000000';

      const response = await authenticatedRequest(app, authToken)
        .post(`/api/stories/${sourceStory.id}/dependencies`)
        .send({
          target_story_id: fakeTargetId,
          link_type: 'IS_BLOCKED_BY',
        })
        .expect(404);

      expect(response.body.message).toMatch(/not found|target|story/i);
    });
  });

  describe('DELETE /api/stories/:sourceId/dependencies/:targetId - Service Validation', () => {
    it('should return 404 when trying to delete non-existent dependency', async () => {
      const journey = await createJourney(app, authToken, storyMap.id, 'Test Journey');
      const step = await createStep(app, authToken, journey.id, 'Test Step');
      const release = await createRelease(app, authToken, storyMap.id, 'Test Release');
      const story1 = await createStory(app, authToken, step.id, release.id, { title: 'Story 1' });
      const story2 = await createStory(app, authToken, step.id, release.id, { title: 'Story 2' });

      // Try to delete dependency that doesn't exist
      const response = await authenticatedRequest(app, authToken)
        .delete(`/api/stories/${story1.id}/dependencies/${story2.id}`)
        .expect(404);

      expect(response.body.message).toMatch(/not found|dependency/i);
    });
  });

  describe('DELETE /api/stories/:id - Dependency Cleanup', () => {
    it('should clean up all dependencies when story is deleted', async () => {
      // Create journey, step, and release using factories
      const journey = await createJourney(app, authToken, storyMap.id, 'Test Journey');
      const step = await createStep(app, authToken, journey.id, 'Test Step');
      const release = await createRelease(app, authToken, storyMap.id, 'Test Release');

      // Create three stories using factories
      const storyA = await createStory(app, authToken, step.id, release.id, { title: 'Story A' });
      const storyB = await createStory(app, authToken, step.id, release.id, { title: 'Story B' });
      const storyC = await createStory(app, authToken, step.id, release.id, { title: 'Story C' });

      // Create dependencies:
      // - storyB blocked by storyA
      await authenticatedRequest(app, authToken)
        .post(`/api/stories/${storyB.id}/dependencies`)
        .send({
          target_story_id: storyA.id,
          link_type: 'IS_BLOCKED_BY',
        })
        .expect(201);

      // - storyC blocked by storyB
      await authenticatedRequest(app, authToken)
        .post(`/api/stories/${storyC.id}/dependencies`)
        .send({
          target_story_id: storyB.id,
          link_type: 'IS_BLOCKED_BY',
        })
        .expect(201);

      // Verify dependencies exist
      const dependenciesBefore = await authenticatedRequest(app, authToken)
        .get(`/api/stories/${storyB.id}/dependencies`)
        .expect(200)
        .then(res => res.body);

      expect(dependenciesBefore.outgoing).toHaveLength(1);
      expect(dependenciesBefore.incoming).toHaveLength(1);

      // Delete storyB
      const deleteResponse = await authenticatedRequest(app, authToken)
        .delete(`/api/stories/${storyB.id}`)
        .expect(200)
        .then(res => res.body);

      // Verify dependencies were removed
      expect(deleteResponse.dependencies_removed).toBeGreaterThanOrEqual(2);

      // Verify storyA no longer has storyB in its incoming dependencies
      const dependenciesA = await authenticatedRequest(app, authToken)
        .get(`/api/stories/${storyA.id}/dependencies`)
        .expect(200)
        .then(res => res.body);

      expect(dependenciesA.incoming).toHaveLength(0);

      // Verify storyC no longer has storyB in its outgoing dependencies
      const dependenciesC = await authenticatedRequest(app, authToken)
        .get(`/api/stories/${storyC.id}/dependencies`)
        .expect(200)
        .then(res => res.body);

      expect(dependenciesC.outgoing).toHaveLength(0);
    });
  });

  // ==================== EDGE CASES ====================

  describe('POST /api/stories/:id/dependencies - Edge Cases', () => {
    it('should allow multiple different link types between same two stories', async () => {
      const journey = await createJourney(app, authToken, storyMap.id, 'Test Journey');
      const step = await createStep(app, authToken, journey.id, 'Test Step');
      const release = await createRelease(app, authToken, storyMap.id, 'Test Release');
      const story1 = await createStory(app, authToken, step.id, release.id, { title: 'Story 1' });
      const story2 = await createStory(app, authToken, step.id, release.id, { title: 'Story 2' });

      // Create first dependency: IS_BLOCKED_BY
      await authenticatedRequest(app, authToken)
        .post(`/api/stories/${story1.id}/dependencies`)
        .send({
          target_story_id: story2.id,
          link_type: 'IS_BLOCKED_BY',
        })
        .expect(201);

      // Create second dependency: LINKED_TO (different link type)
      const secondDep = await authenticatedRequest(app, authToken)
        .post(`/api/stories/${story1.id}/dependencies`)
        .send({
          target_story_id: story2.id,
          link_type: 'LINKED_TO',
        })
        .expect(201)
        .then(res => res.body);

      expect(secondDep.link_type).toBe('LINKED_TO');

      // Verify both dependencies exist
      const dependencies = await authenticatedRequest(app, authToken)
        .get(`/api/stories/${story1.id}/dependencies`)
        .expect(200)
        .then(res => res.body);

      expect(dependencies.outgoing).toHaveLength(2);
      const linkTypes = dependencies.outgoing.map((d: any) => d.link_type);
      expect(linkTypes).toContain('IS_BLOCKED_BY');
      expect(linkTypes).toContain('LINKED_TO');
    });

    it('should handle bidirectional dependencies correctly', async () => {
      const journey = await createJourney(app, authToken, storyMap.id, 'Test Journey');
      const step = await createStep(app, authToken, journey.id, 'Test Step');
      const release = await createRelease(app, authToken, storyMap.id, 'Test Release');
      const storyA = await createStory(app, authToken, step.id, release.id, { title: 'Story A' });
      const storyB = await createStory(app, authToken, step.id, release.id, { title: 'Story B' });

      // Create dependency: A is blocked by B
      await authenticatedRequest(app, authToken)
        .post(`/api/stories/${storyA.id}/dependencies`)
        .send({
          target_story_id: storyB.id,
          link_type: 'IS_BLOCKED_BY',
        })
        .expect(201);

      // Create reverse dependency: B is linked to A
      await authenticatedRequest(app, authToken)
        .post(`/api/stories/${storyB.id}/dependencies`)
        .send({
          target_story_id: storyA.id,
          link_type: 'LINKED_TO',
        })
        .expect(201);

      // Get dependencies for A
      const depsA = await authenticatedRequest(app, authToken)
        .get(`/api/stories/${storyA.id}/dependencies`)
        .expect(200)
        .then(res => res.body);

      // A should have 1 outgoing (to B) and 1 incoming (from B)
      expect(depsA.outgoing).toHaveLength(1);
      expect(depsA.incoming).toHaveLength(1);
      expect(depsA.outgoing[0].link_type).toBe('IS_BLOCKED_BY');
      expect(depsA.incoming[0].link_type).toBe('LINKED_TO');
    });
  });

  // ==================== WORKSPACE ISOLATION TESTS ====================

  describe('POST /api/stories/:id/dependencies - Workspace Isolation', () => {
    it('should prevent creating dependency to story in different workspace (400)', async () => {
      // Create first workspace
      const storyMap1 = await createStoryMap(app, authToken);
      const journey1 = await createJourney(app, authToken, storyMap1.id, 'Journey 1');
      const step1 = await createStep(app, authToken, journey1.id, 'Step 1');
      const release1 = await createRelease(app, authToken, storyMap1.id, 'Release 1');
      const story1 = await createStory(app, authToken, step1.id, release1.id, { title: 'Story 1' });

      // Create second workspace
      const storyMap2 = await createStoryMap(app, authToken);
      const journey2 = await createJourney(app, authToken, storyMap2.id, 'Journey 2');
      const step2 = await createStep(app, authToken, journey2.id, 'Step 2');
      const release2 = await createRelease(app, authToken, storyMap2.id, 'Release 2');
      const story2 = await createStory(app, authToken, step2.id, release2.id, { title: 'Story 2' });

      // Try to create dependency from story1 to story2 (different workspaces)
      const response = await authenticatedRequest(app, authToken)
        .post(`/api/stories/${story1.id}/dependencies`)
        .send({
          target_story_id: story2.id,
          link_type: 'IS_BLOCKED_BY',
        })
        .expect(400);

      expect(response.body.message).toMatch(/cannot|different|workspace|story map/i);
    });

    it('should prevent creating dependency from story in different workspace (400)', async () => {
      // Create first workspace
      const storyMap1 = await createStoryMap(app, authToken);
      const journey1 = await createJourney(app, authToken, storyMap1.id, 'Journey 1');
      const step1 = await createStep(app, authToken, journey1.id, 'Step 1');
      const release1 = await createRelease(app, authToken, storyMap1.id, 'Release 1');
      const story1 = await createStory(app, authToken, step1.id, release1.id, { title: 'Story 1' });

      // Create second workspace
      const storyMap2 = await createStoryMap(app, authToken);
      const journey2 = await createJourney(app, authToken, storyMap2.id, 'Journey 2');
      const step2 = await createStep(app, authToken, journey2.id, 'Step 2');
      const release2 = await createRelease(app, authToken, storyMap2.id, 'Release 2');
      const story2 = await createStory(app, authToken, step2.id, release2.id, { title: 'Story 2' });

      // Try to create dependency from story2 to story1 (different workspaces)
      const response = await authenticatedRequest(app, authToken)
        .post(`/api/stories/${story2.id}/dependencies`)
        .send({
          target_story_id: story1.id,
          link_type: 'IS_BLOCKED_BY',
        })
        .expect(400);

      expect(response.body.message).toMatch(/cannot|different|workspace|story map/i);
    });
  });

  describe('GET /api/stories/:id - Include Dependencies', () => {
    it('should include dependencies in story response', async () => {
      // Create journey, step, and release using factories
      const journey = await createJourney(app, authToken, storyMap.id, 'Test Journey');
      const step = await createStep(app, authToken, journey.id, 'Test Step');
      const release = await createRelease(app, authToken, storyMap.id, 'Test Release');

      // Create two stories using factories
      const story1 = await createStory(app, authToken, step.id, release.id, { title: 'Story 1' });
      const story2 = await createStory(app, authToken, step.id, release.id, { title: 'Story 2' });

      // Create dependency
      await authenticatedRequest(app, authToken)
        .post(`/api/stories/${story1.id}/dependencies`)
        .send({
          target_story_id: story2.id,
          link_type: 'IS_BLOCKED_BY',
        })
        .expect(201);

      // Get story1 - should include dependencies
      const storyWithDeps = await authenticatedRequest(app, authToken)
        .get(`/api/stories/${story1.id}`)
        .expect(200)
        .then(res => res.body);

      // Verify dependencies are included
      expect(storyWithDeps).toHaveProperty('dependencies');
      expect(Array.isArray(storyWithDeps.dependencies)).toBe(true);
      expect(storyWithDeps.dependencies).toHaveLength(1);
      expect(storyWithDeps.dependencies[0]).toMatchObject({
        target_story_id: story2.id,
        link_type: 'IS_BLOCKED_BY',
      });
    });
  });
});
