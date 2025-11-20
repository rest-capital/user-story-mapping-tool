/**
 * Story Dependencies E2E Tests (Tier 2)
 *
 * Tests story dependency management:
 * - Create dependency (blocked_by)
 * - List dependencies for story
 * - Remove dependency
 * - Prevent self-dependency
 * - Prevent duplicate dependencies
 * - Verify dependencies cleaned up on delete
 * - Include dependencies in response
 *
 * Following patterns from E2E_TESTING_STRATEGY.md Tier 2.5
 * REFACTORED: Using factory pattern for entity creation
 */

import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './helpers/test-app';
import { createAuthToken, authenticatedRequest } from './helpers/auth';
import { createJourney, createStep, createRelease, createStory } from './factories';

describe('Story Dependencies (E2E) - Tier 2', () => {
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

  describe('POST /api/stories/:id/dependencies', () => {
    it('should create a dependency (blocked_by relationship)', async () => {
      // Create journey, step, and release using factories
      const journey = await createJourney(app, authToken, 'Test Journey');
      const step = await createStep(app, authToken, journey.id, 'Test Step');
      const release = await createRelease(app, authToken, 'Test Release');

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
      const journey = await createJourney(app, authToken, 'Test Journey');
      const step = await createStep(app, authToken, journey.id, 'Test Step');
      const release = await createRelease(app, authToken, 'Test Release');

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
      const journey = await createJourney(app, authToken, 'Test Journey');
      const step = await createStep(app, authToken, journey.id, 'Test Step');
      const release = await createRelease(app, authToken, 'Test Release');

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

  describe('GET /api/stories/:id/dependencies', () => {
    it('should list all dependencies for a story (both outgoing and incoming)', async () => {
      // Create journey, step, and release using factories
      const journey = await createJourney(app, authToken, 'Test Journey');
      const step = await createStep(app, authToken, journey.id, 'Test Step');
      const release = await createRelease(app, authToken, 'Test Release');

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
      const journey = await createJourney(app, authToken, 'Test Journey');
      const step = await createStep(app, authToken, journey.id, 'Test Step');
      const release = await createRelease(app, authToken, 'Test Release');

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

  describe('DELETE /api/stories/:id - Dependency Cleanup', () => {
    it('should clean up all dependencies when story is deleted', async () => {
      // Create journey, step, and release using factories
      const journey = await createJourney(app, authToken, 'Test Journey');
      const step = await createStep(app, authToken, journey.id, 'Test Step');
      const release = await createRelease(app, authToken, 'Test Release');

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

  describe('GET /api/stories/:id - Include Dependencies', () => {
    it('should include dependencies in story response', async () => {
      // Create journey, step, and release using factories
      const journey = await createJourney(app, authToken, 'Test Journey');
      const step = await createStep(app, authToken, journey.id, 'Test Step');
      const release = await createRelease(app, authToken, 'Test Release');

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
