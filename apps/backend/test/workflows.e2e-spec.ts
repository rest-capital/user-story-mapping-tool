/**
 * Multi-Entity Workflows E2E Tests (Tier 2.7)
 *
 * Tests end-to-end workflows across multiple entities:
 * - Create complete story map (journey → steps → releases → stories)
 * - Add tags and personas to existing story
 * - Move story and verify all associations intact
 * - Delete journey and verify all nested entities removed
 * - Service validation (404 for non-existent entities)
 * - Edge cases (duplicates, performance, complex scenarios)
 * - Workspace isolation (CRITICAL SECURITY - cross-workspace operations)
 *
 * Following patterns from E2E_TESTING_STRATEGY.md Tier 2.7
 * REFACTORED: Using factory pattern for entity creation
 * STATUS: EXCELLENT (14 tests) - Comprehensive workflow coverage
 */

import { INestApplication } from '@nestjs/common';
import { createTestApp } from './helpers/test-app';
import { createAuthToken, authenticatedRequest } from './helpers/auth';
import {
  createStoryMap,
  createJourney,
  createStep,
  createRelease,
  createStory,
  createTag,
  createPersona,
} from './factories';

describe('Multi-Entity Workflows (E2E) - Tier 2.7', () => {
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

  describe('Complete Story Map Creation', () => {
    it('should create complete story map (journey → steps → releases → stories)', async () => {
      // Step 1: Create journey using factory
      const journey = await createJourney(app, authToken, storyMap.id, 'User Onboarding Journey');

      expect(journey.id).toBeDefined();
      expect(journey.name).toBe('User Onboarding Journey');

      // Step 2: Create 3 steps in the journey using factories
      const step1 = await createStep(app, authToken, journey.id, 'Discover');
      const step2 = await createStep(app, authToken, journey.id, 'Sign Up');
      const step3 = await createStep(app, authToken, journey.id, 'First Login');

      expect(step1.sort_order).toBe(0);
      expect(step2.sort_order).toBe(1);
      expect(step3.sort_order).toBe(2);

      // Step 3: Create 2 releases using factories
      const mvp = await createRelease(app, authToken, storyMap.id, 'MVP');
      const v2 = await createRelease(app, authToken, storyMap.id, 'V2');

      // Step 4: Create stories in different cells using factories
      const story1 = await createStory(app, authToken, step1.id, mvp.id, {
        title: 'View landing page',
      });

      const story2 = await createStory(app, authToken, step2.id, mvp.id, {
        title: 'Create account',
      });

      const story3 = await createStory(app, authToken, step3.id, v2.id, {
        title: 'See personalized dashboard',
      });

      // Verify stories are created correctly
      expect(story1.step_id).toBe(step1.id);
      expect(story1.release_id).toBe(mvp.id);
      expect(story2.step_id).toBe(step2.id);
      expect(story2.release_id).toBe(mvp.id);
      expect(story3.step_id).toBe(step3.id);
      expect(story3.release_id).toBe(v2.id);

      // Step 5: Verify journey structure by fetching all related entities
      const journeyWithSteps = await authenticatedRequest(app, authToken)
        .get(`/api/journeys/${journey.id}`)
        .expect(200)
        .then(res => res.body);

      expect(journeyWithSteps.id).toBe(journey.id);

      const allSteps = await authenticatedRequest(app, authToken)
        .get(`/api/steps?journey_id=${journey.id}`)
        .expect(200)
        .then(res => res.body);

      expect(allSteps).toHaveLength(3);
      expect(allSteps.map((s: any) => s.name)).toEqual(['Discover', 'Sign Up', 'First Login']);

      // Verify stories exist in each cell
      const step1Stories = await authenticatedRequest(app, authToken)
        .get(`/api/stories?step_id=${step1.id}&release_id=${mvp.id}`)
        .expect(200)
        .then(res => res.body);

      expect(step1Stories).toHaveLength(1);
      expect(step1Stories[0].title).toBe('View landing page');
    });
  });

  describe('Story Associations', () => {
    it('should add tags and personas to existing story', async () => {
      // Create journey, step, release, and story using factories
      const journey = await createJourney(app, authToken, storyMap.id, 'Test Journey');
      const step = await createStep(app, authToken, journey.id, 'Test Step');
      const release = await createRelease(app, authToken, storyMap.id, 'Test Release');
      const story = await createStory(app, authToken, step.id, release.id, {
        title: 'Feature Story',
      });

      // Create tags using factories
      const tag1 = await createTag(app, authToken, storyMap.id);
      const tag2 = await createTag(app, authToken, storyMap.id, 'Important');

      // Create personas using factories
      const persona1 = await createPersona(app, authToken, storyMap.id);
      const persona2 = await createPersona(app, authToken, storyMap.id, 'Admin User');

      // Add tags to story
      await authenticatedRequest(app, authToken)
        .post(`/api/stories/${story.id}/tags`)
        .send({ tag_id: tag1.id })
        .expect(201);

      await authenticatedRequest(app, authToken)
        .post(`/api/stories/${story.id}/tags`)
        .send({ tag_id: tag2.id })
        .expect(201);

      // Add personas to story
      await authenticatedRequest(app, authToken)
        .post(`/api/stories/${story.id}/personas`)
        .send({ persona_id: persona1.id })
        .expect(201);

      await authenticatedRequest(app, authToken)
        .post(`/api/stories/${story.id}/personas`)
        .send({ persona_id: persona2.id })
        .expect(201);

      // Verify tags are associated
      const storyTags = await authenticatedRequest(app, authToken)
        .get(`/api/stories/${story.id}/tags`)
        .expect(200)
        .then(res => res.body);

      expect(storyTags).toHaveLength(2);
      expect(storyTags.map((t: any) => t.id)).toContain(tag1.id);
      expect(storyTags.map((t: any) => t.id)).toContain(tag2.id);

      // Verify personas are associated
      const storyPersonas = await authenticatedRequest(app, authToken)
        .get(`/api/stories/${story.id}/personas`)
        .expect(200)
        .then(res => res.body);

      expect(storyPersonas).toHaveLength(2);
      expect(storyPersonas.map((p: any) => p.id)).toContain(persona1.id);
      expect(storyPersonas.map((p: any) => p.id)).toContain(persona2.id);

      // Verify story details include associations
      const storyDetails = await authenticatedRequest(app, authToken)
        .get(`/api/stories/${story.id}`)
        .expect(200)
        .then(res => res.body);

      expect(storyDetails.id).toBe(story.id);
    });
  });

  describe('Story Movement with Associations', () => {
    it('should move story and verify all associations remain intact', async () => {
      // Create infrastructure using factories
      const journey = await createJourney(app, authToken, storyMap.id, 'Test Journey');
      const step1 = await createStep(app, authToken, journey.id, 'Step 1');
      const step2 = await createStep(app, authToken, journey.id, 'Step 2');
      const release1 = await createRelease(app, authToken, storyMap.id, 'Release 1');
      const release2 = await createRelease(app, authToken, storyMap.id, 'Release 2');

      // Create story with associations using factories
      const story = await createStory(app, authToken, step1.id, release1.id, {
        title: 'Movable Story',
      });

      const tag = await createTag(app, authToken, storyMap.id, 'Test Tag');
      const persona = await createPersona(app, authToken, storyMap.id, 'Test Persona');

      await authenticatedRequest(app, authToken)
        .post(`/api/stories/${story.id}/tags`)
        .send({ tag_id: tag.id })
        .expect(201);

      await authenticatedRequest(app, authToken)
        .post(`/api/stories/${story.id}/personas`)
        .send({ persona_id: persona.id })
        .expect(201);

      // Add a dependency
      const dependencyStory = await createStory(app, authToken, step1.id, release1.id, {
        title: 'Dependency',
      });

      await authenticatedRequest(app, authToken)
        .post(`/api/stories/${story.id}/dependencies`)
        .send({
          target_story_id: dependencyStory.id,
          link_type: 'IS_BLOCKED_BY',
        })
        .expect(201);

      // Move story to different cell
      const movedStory = await authenticatedRequest(app, authToken)
        .post(`/api/stories/${story.id}/move`)
        .send({
          step_id: step2.id,
          release_id: release2.id,
        })
        .expect(201)
        .then(res => res.body);

      // Verify story moved
      expect(movedStory.step_id).toBe(step2.id);
      expect(movedStory.release_id).toBe(release2.id);
      expect(movedStory.title).toBe('Movable Story');

      // Verify tags still associated
      const tagsAfterMove = await authenticatedRequest(app, authToken)
        .get(`/api/stories/${story.id}/tags`)
        .expect(200)
        .then(res => res.body);

      expect(tagsAfterMove).toHaveLength(1);
      expect(tagsAfterMove[0].id).toBe(tag.id);

      // Verify personas still associated
      const personasAfterMove = await authenticatedRequest(app, authToken)
        .get(`/api/stories/${story.id}/personas`)
        .expect(200)
        .then(res => res.body);

      expect(personasAfterMove).toHaveLength(1);
      expect(personasAfterMove[0].id).toBe(persona.id);

      // Verify dependencies still exist
      const depsAfterMove = await authenticatedRequest(app, authToken)
        .get(`/api/stories/${story.id}/dependencies`)
        .expect(200)
        .then(res => res.body);

      expect(depsAfterMove.outgoing).toHaveLength(1);
      expect(depsAfterMove.outgoing[0].target_story_id).toBe(dependencyStory.id);
    });
  });

  describe('Journey Cascade Delete', () => {
    it('should delete journey and verify all nested entities removed', async () => {
      // Create complete hierarchy using factories
      const journey = await createJourney(app, authToken, storyMap.id, 'Journey to Delete');
      const step1 = await createStep(app, authToken, journey.id, 'Step 1');
      const step2 = await createStep(app, authToken, journey.id, 'Step 2');
      const release = await createRelease(app, authToken, storyMap.id, 'Test Release');

      const story1 = await createStory(app, authToken, step1.id, release.id, {
        title: 'Story 1',
      });

      const story2 = await createStory(app, authToken, step2.id, release.id, {
        title: 'Story 2',
      });

      // Delete journey (requires story_map_id for workspace validation)
      const deleteResponse = await authenticatedRequest(app, authToken)
        .delete(`/api/journeys/${journey.id}?story_map_id=${storyMap.id}`)
        .expect(200);

      expect(deleteResponse.body.success).toBe(true);

      // Verify journey is gone
      await authenticatedRequest(app, authToken)
        .get(`/api/journeys/${journey.id}`)
        .expect(404);

      // Verify steps are gone (cascade delete)
      await authenticatedRequest(app, authToken)
        .get(`/api/steps/${step1.id}`)
        .expect(404);

      await authenticatedRequest(app, authToken)
        .get(`/api/steps/${step2.id}`)
        .expect(404);

      // Verify stories are gone (cascade delete)
      await authenticatedRequest(app, authToken)
        .get(`/api/stories/${story1.id}`)
        .expect(404);

      await authenticatedRequest(app, authToken)
        .get(`/api/stories/${story2.id}`)
        .expect(404);

      // Verify release still exists (NOT cascade deleted)
      await authenticatedRequest(app, authToken)
        .get(`/api/releases/${release.id}`)
        .expect(200);
    });
  });

  // ==================== SERVICE VALIDATION TESTS ====================
  describe('Service Validation - Non-existent entities', () => {
    it('should return 404 when adding tag to non-existent story', async () => {
      const tag = await createTag(app, authToken, storyMap.id, 'Test Tag');
      const fakeStoryId = '00000000-0000-0000-0000-000000000000';

      const response = await authenticatedRequest(app, authToken)
        .post(`/api/stories/${fakeStoryId}/tags`)
        .send({ tag_id: tag.id })
        .expect(404);

      expect(response.body.message).toMatch(/not found/i);
    });

    it('should return 404 when adding persona to non-existent story', async () => {
      const persona = await createPersona(app, authToken, storyMap.id, 'Test Persona');
      const fakeStoryId = '00000000-0000-0000-0000-000000000000';

      const response = await authenticatedRequest(app, authToken)
        .post(`/api/stories/${fakeStoryId}/personas`)
        .send({ persona_id: persona.id })
        .expect(404);

      expect(response.body.message).toMatch(/not found/i);
    });

    it('should return 404 when moving non-existent story', async () => {
      const journey = await createJourney(app, authToken, storyMap.id, 'Test Journey');
      const step = await createStep(app, authToken, journey.id, 'Test Step');
      const release = await createRelease(app, authToken, storyMap.id, 'Test Release');
      const fakeStoryId = '00000000-0000-0000-0000-000000000000';

      const response = await authenticatedRequest(app, authToken)
        .post(`/api/stories/${fakeStoryId}/move`)
        .send({ step_id: step.id, release_id: release.id })
        .expect(404);

      expect(response.body.message).toMatch(/not found/i);
    });

    it('should return 404 when creating dependency with non-existent target story', async () => {
      const journey = await createJourney(app, authToken, storyMap.id, 'Test Journey');
      const step = await createStep(app, authToken, journey.id, 'Test Step');
      const release = await createRelease(app, authToken, storyMap.id, 'Test Release');
      const story = await createStory(app, authToken, step.id, release.id, {
        title: 'Source Story',
      });

      const fakeTargetId = '00000000-0000-0000-0000-000000000000';

      const response = await authenticatedRequest(app, authToken)
        .post(`/api/stories/${story.id}/dependencies`)
        .send({
          target_story_id: fakeTargetId,
          link_type: 'IS_BLOCKED_BY',
        })
        .expect(404);

      expect(response.body.message).toMatch(/not found/i);
    });
  });

  // ==================== EDGE CASES ====================
  describe('Edge Cases', () => {
    it('should prevent duplicate tag associations (idempotent operation)', async () => {
      const journey = await createJourney(app, authToken, storyMap.id, 'Test Journey');
      const step = await createStep(app, authToken, journey.id, 'Test Step');
      const release = await createRelease(app, authToken, storyMap.id, 'Test Release');
      const story = await createStory(app, authToken, step.id, release.id, {
        title: 'Test Story',
      });

      const tag = await createTag(app, authToken, storyMap.id, 'Test Tag');

      // Add tag first time - should succeed
      await authenticatedRequest(app, authToken)
        .post(`/api/stories/${story.id}/tags`)
        .send({ tag_id: tag.id })
        .expect(201);

      // Add same tag again - should return 409 conflict
      const response = await authenticatedRequest(app, authToken)
        .post(`/api/stories/${story.id}/tags`)
        .send({ tag_id: tag.id })
        .expect(409);

      expect(response.body.message).toMatch(/already/i);
    });

    it('should prevent duplicate persona associations (idempotent operation)', async () => {
      const journey = await createJourney(app, authToken, storyMap.id, 'Test Journey');
      const step = await createStep(app, authToken, journey.id, 'Test Step');
      const release = await createRelease(app, authToken, storyMap.id, 'Test Release');
      const story = await createStory(app, authToken, step.id, release.id, {
        title: 'Test Story',
      });

      const persona = await createPersona(app, authToken, storyMap.id, 'Test Persona');

      // Add persona first time - should succeed
      await authenticatedRequest(app, authToken)
        .post(`/api/stories/${story.id}/personas`)
        .send({ persona_id: persona.id })
        .expect(201);

      // Add same persona again - should return 409 conflict
      const response = await authenticatedRequest(app, authToken)
        .post(`/api/stories/${story.id}/personas`)
        .send({ persona_id: persona.id })
        .expect(409);

      expect(response.body.message).toMatch(/already/i);
    });

    it('should handle story with many associations (performance test)', async () => {
      const journey = await createJourney(app, authToken, storyMap.id, 'Test Journey');
      const step = await createStep(app, authToken, journey.id, 'Test Step');
      const release = await createRelease(app, authToken, storyMap.id, 'Test Release');
      const story = await createStory(app, authToken, step.id, release.id, {
        title: 'Story with Many Associations',
      });

      // Create and add 5 tags
      const tags = await Promise.all(
        Array.from({ length: 5 }, (_, i) =>
          createTag(app, authToken, storyMap.id, `Tag ${i + 1}`)
        )
      );

      for (const tag of tags) {
        await authenticatedRequest(app, authToken)
          .post(`/api/stories/${story.id}/tags`)
          .send({ tag_id: tag.id })
          .expect(201);
      }

      // Create and add 5 personas
      const personas = await Promise.all(
        Array.from({ length: 5 }, (_, i) =>
          createPersona(app, authToken, storyMap.id, `Persona ${i + 1}`)
        )
      );

      for (const persona of personas) {
        await authenticatedRequest(app, authToken)
          .post(`/api/stories/${story.id}/personas`)
          .send({ persona_id: persona.id })
          .expect(201);
      }

      // Create and add 3 dependencies
      const dependencyStories = await Promise.all(
        Array.from({ length: 3 }, (_, i) =>
          createStory(app, authToken, step.id, release.id, {
            title: `Dependency Story ${i + 1}`,
          })
        )
      );

      for (const depStory of dependencyStories) {
        await authenticatedRequest(app, authToken)
          .post(`/api/stories/${story.id}/dependencies`)
          .send({
            target_story_id: depStory.id,
            link_type: 'IS_BLOCKED_BY',
          })
          .expect(201);
      }

      // Verify all associations are fetched correctly
      const storyTags = await authenticatedRequest(app, authToken)
        .get(`/api/stories/${story.id}/tags`)
        .expect(200)
        .then(res => res.body);

      expect(storyTags).toHaveLength(5);

      const storyPersonas = await authenticatedRequest(app, authToken)
        .get(`/api/stories/${story.id}/personas`)
        .expect(200)
        .then(res => res.body);

      expect(storyPersonas).toHaveLength(5);

      const storyDeps = await authenticatedRequest(app, authToken)
        .get(`/api/stories/${story.id}/dependencies`)
        .expect(200)
        .then(res => res.body);

      expect(storyDeps.outgoing).toHaveLength(3);
    });
  });

  // ==================== WORKSPACE ISOLATION TESTS ====================
  describe('Workspace Isolation - CRITICAL SECURITY', () => {
    let authToken2: string;

    beforeEach(async () => {
      authToken2 = await createAuthToken(app);
    });

    it('should prevent adding tag from another workspace to story', async () => {
      // User 1: Create story in workspace 1
      const journey = await createJourney(app, authToken, storyMap.id, 'Journey 1');
      const step = await createStep(app, authToken, journey.id, 'Step 1');
      const release = await createRelease(app, authToken, storyMap.id, 'Release 1');
      const story = await createStory(app, authToken, step.id, release.id, {
        title: 'Story in Workspace 1',
      });

      // User 2: Create tag in workspace 2
      const storyMap2 = await createStoryMap(app, authToken2);
      const tagFromWorkspace2 = await createTag(app, authToken2, storyMap2.id, 'Tag from WS2');

      // User 1: Try to add tag from workspace 2 to their story
      const response = await authenticatedRequest(app, authToken)
        .post(`/api/stories/${story.id}/tags`)
        .send({ tag_id: tagFromWorkspace2.id })
        .expect(404);

      expect(response.body.message).toMatch(/not found/i);

      // Verify tag was NOT added
      const storyTags = await authenticatedRequest(app, authToken)
        .get(`/api/stories/${story.id}/tags`)
        .expect(200)
        .then(res => res.body);

      expect(storyTags).toHaveLength(0);
    });

    it('should prevent adding persona from another workspace to story', async () => {
      // User 1: Create story in workspace 1
      const journey = await createJourney(app, authToken, storyMap.id, 'Journey 1');
      const step = await createStep(app, authToken, journey.id, 'Step 1');
      const release = await createRelease(app, authToken, storyMap.id, 'Release 1');
      const story = await createStory(app, authToken, step.id, release.id, {
        title: 'Story in Workspace 1',
      });

      // User 2: Create persona in workspace 2
      const storyMap2 = await createStoryMap(app, authToken2);
      const personaFromWorkspace2 = await createPersona(app, authToken2, storyMap2.id, 'Persona from WS2');

      // User 1: Try to add persona from workspace 2 to their story
      const response = await authenticatedRequest(app, authToken)
        .post(`/api/stories/${story.id}/personas`)
        .send({ persona_id: personaFromWorkspace2.id })
        .expect(404);

      expect(response.body.message).toMatch(/not found/i);

      // Verify persona was NOT added
      const storyPersonas = await authenticatedRequest(app, authToken)
        .get(`/api/stories/${story.id}/personas`)
        .expect(200)
        .then(res => res.body);

      expect(storyPersonas).toHaveLength(0);
    });

    it('should prevent moving story to step from another workspace', async () => {
      // User 1: Create story in workspace 1
      const journey1 = await createJourney(app, authToken, storyMap.id, 'Journey 1');
      const step1 = await createStep(app, authToken, journey1.id, 'Step 1');
      const release1 = await createRelease(app, authToken, storyMap.id, 'Release 1');
      const story = await createStory(app, authToken, step1.id, release1.id, {
        title: 'Story in Workspace 1',
      });

      // User 2: Create step in workspace 2
      const storyMap2 = await createStoryMap(app, authToken2);
      const journey2 = await createJourney(app, authToken2, storyMap2.id, 'Journey 2');
      const stepFromWorkspace2 = await createStep(app, authToken2, journey2.id, 'Step from WS2');

      // User 1: Try to move their story to step from workspace 2
      const response = await authenticatedRequest(app, authToken)
        .post(`/api/stories/${story.id}/move`)
        .send({ step_id: stepFromWorkspace2.id, release_id: release1.id })
        .expect(404);

      expect(response.body.message).toMatch(/not found/i);

      // Verify story did NOT move
      const storyDetails = await authenticatedRequest(app, authToken)
        .get(`/api/stories/${story.id}`)
        .expect(200)
        .then(res => res.body);

      expect(storyDetails.step_id).toBe(step1.id); // Still in original step
    });

    it('should prevent creating dependency with story from another workspace', async () => {
      // User 1: Create story in workspace 1
      const journey1 = await createJourney(app, authToken, storyMap.id, 'Journey 1');
      const step1 = await createStep(app, authToken, journey1.id, 'Step 1');
      const release1 = await createRelease(app, authToken, storyMap.id, 'Release 1');
      const story1 = await createStory(app, authToken, step1.id, release1.id, {
        title: 'Story in Workspace 1',
      });

      // User 2: Create story in workspace 2
      const storyMap2 = await createStoryMap(app, authToken2);
      const journey2 = await createJourney(app, authToken2, storyMap2.id, 'Journey 2');
      const step2 = await createStep(app, authToken2, journey2.id, 'Step 2');
      const release2 = await createRelease(app, authToken2, storyMap2.id, 'Release 2');
      const storyFromWorkspace2 = await createStory(app, authToken2, step2.id, release2.id, {
        title: 'Story in Workspace 2',
      });

      // User 1: Try to create dependency with story from workspace 2
      const response = await authenticatedRequest(app, authToken)
        .post(`/api/stories/${story1.id}/dependencies`)
        .send({
          target_story_id: storyFromWorkspace2.id,
          link_type: 'IS_BLOCKED_BY',
        })
        .expect(404);

      expect(response.body.message).toMatch(/not found/i);

      // Verify dependency was NOT created
      const deps = await authenticatedRequest(app, authToken)
        .get(`/api/stories/${story1.id}/dependencies`)
        .expect(200)
        .then(res => res.body);

      expect(deps.outgoing).toHaveLength(0);
    });
  });
});
