/**
 * Cascade Delete Workflows E2E Tests (Tier 2.6)
 *
 * Tests cascade delete behavior across all entities:
 * - Journey deletion cascades to steps and stories
 * - Step deletion cascades to stories
 * - Release deletion moves stories to Unassigned (not delete)
 * - Story deletion cleans up comments and dependencies
 * - Tag deletion removes associations (not stories)
 * - Persona deletion removes associations (not stories)
 *
 * Following patterns from E2E_TESTING_STRATEGY.md
 * REFACTORED: Using factory pattern for entity creation
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
  getUnassignedRelease,
} from './factories';

describe('Cascade Delete Workflows (E2E) - Tier 2.6', () => {
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

  describe('DELETE /api/journeys/:id - Cascade to steps and stories', () => {
    it('should cascade delete journey along with its steps and stories', async () => {
      // Create journey using factory
      const journey = await createJourney(app, authToken, storyMap.id, 'Journey to Delete');

      // Create 2 steps in the journey using factories
      const step1 = await createStep(app, authToken, journey.id, 'Step 1');
      const step2 = await createStep(app, authToken, journey.id, 'Step 2');

      // Get Unassigned release using factory
      const release = await getUnassignedRelease(app, authToken, storyMap.id);

      // Create stories in each step using factories
      const story1 = await createStory(app, authToken, step1.id, release.id, { title: 'Story 1' });
      const story2 = await createStory(app, authToken, step2.id, release.id, { title: 'Story 2' });

      // Delete the journey
      const deleteResponse = await authenticatedRequest(app, authToken)
        .delete(`/api/journeys/${journey.id}`)
        .expect(200);

      // Verify response
      expect(deleteResponse.body).toMatchObject({
        success: true,
      });

      // Verify journey is gone
      await authenticatedRequest(app, authToken)
        .get(`/api/journeys/${journey.id}`)
        .expect(404);

      // Verify steps are gone (cascade)
      await authenticatedRequest(app, authToken)
        .get(`/api/steps/${step1.id}`)
        .expect(404);

      await authenticatedRequest(app, authToken)
        .get(`/api/steps/${step2.id}`)
        .expect(404);

      // Verify stories are gone (cascade through steps)
      await authenticatedRequest(app, authToken)
        .get(`/api/stories/${story1.id}`)
        .expect(404);

      await authenticatedRequest(app, authToken)
        .get(`/api/stories/${story2.id}`)
        .expect(404);
    });
  });

  describe('DELETE /api/steps/:id - Cascade to stories', () => {
    it('should cascade delete step along with its stories', async () => {
      // Create journey and step using factories
      const journey = await createJourney(app, authToken, storyMap.id, 'Test Journey');
      const step = await createStep(app, authToken, journey.id, 'Step to Delete');

      // Get Unassigned release using factory
      const release = await getUnassignedRelease(app, authToken, storyMap.id);

      // Create multiple stories in the step using factories
      const story1 = await createStory(app, authToken, step.id, release.id, { title: 'Story 1' });
      const story2 = await createStory(app, authToken, step.id, release.id, { title: 'Story 2' });
      const story3 = await createStory(app, authToken, step.id, release.id, { title: 'Story 3' });

      // Delete the step
      const deleteResponse = await authenticatedRequest(app, authToken)
        .delete(`/api/steps/${step.id}`)
        .expect(200);

      // Verify response
      expect(deleteResponse.body).toMatchObject({
        success: true,
      });

      // Verify step is gone
      await authenticatedRequest(app, authToken)
        .get(`/api/steps/${step.id}`)
        .expect(404);

      // Verify all stories are gone (cascade)
      await authenticatedRequest(app, authToken)
        .get(`/api/stories/${story1.id}`)
        .expect(404);

      await authenticatedRequest(app, authToken)
        .get(`/api/stories/${story2.id}`)
        .expect(404);

      await authenticatedRequest(app, authToken)
        .get(`/api/stories/${story3.id}`)
        .expect(404);

      // Verify journey still exists
      await authenticatedRequest(app, authToken)
        .get(`/api/journeys/${journey.id}`)
        .expect(200);
    });
  });

  describe('DELETE /api/releases/:id - Move stories to Unassigned', () => {
    it('should delete release but move stories to Unassigned (not cascade delete)', async () => {
      // Create journey and step using factories
      const journey = await createJourney(app, authToken, storyMap.id, 'Test Journey');
      const step = await createStep(app, authToken, journey.id, 'Test Step');

      // Create a custom release using factory
      const release = await createRelease(app, authToken, storyMap.id, 'Release to Delete');

      // Get Unassigned release using factory
      const unassigned = await getUnassignedRelease(app, authToken, storyMap.id);

      // Create stories in the custom release using factories
      const story1 = await createStory(app, authToken, step.id, release.id, { title: 'Story 1' });
      const story2 = await createStory(app, authToken, step.id, release.id, { title: 'Story 2' });

      // Delete the release
      const deleteResponse = await authenticatedRequest(app, authToken)
        .delete(`/api/releases/${release.id}`)
        .expect(200);

      // Verify response includes stories_moved count
      expect(deleteResponse.body).toMatchObject({
        success: true,
        stories_moved: 2,
      });

      // Verify release is gone
      await authenticatedRequest(app, authToken)
        .get(`/api/releases/${release.id}`)
        .expect(404);

      // Verify stories still exist but moved to Unassigned
      const updatedStory1 = await authenticatedRequest(app, authToken)
        .get(`/api/stories/${story1.id}`)
        .expect(200)
        .then(res => res.body);

      const updatedStory2 = await authenticatedRequest(app, authToken)
        .get(`/api/stories/${story2.id}`)
        .expect(200)
        .then(res => res.body);

      // Verify both stories now belong to Unassigned release
      expect(updatedStory1.release_id).toBe(unassigned.id);
      expect(updatedStory2.release_id).toBe(unassigned.id);
    });
  });

  describe('DELETE /api/stories/:id - Clean up comments and dependencies', () => {
    it('should delete story and clean up all comments and dependencies', async () => {
      // This is already tested in story-dependencies.e2e-spec.ts,
      // but we'll verify the complete cleanup flow here

      // Create journey, step, and release using factories
      const journey = await createJourney(app, authToken, storyMap.id, 'Test Journey');
      const step = await createStep(app, authToken, journey.id, 'Test Step');
      const release = await getUnassignedRelease(app, authToken, storyMap.id);

      // Create 3 stories using factories
      const story1 = await createStory(app, authToken, step.id, release.id, { title: 'Story 1' });
      const story2 = await createStory(app, authToken, step.id, release.id, { title: 'Story 2' });
      const story3 = await createStory(app, authToken, step.id, release.id, { title: 'Story 3' });

      // Create dependencies: story1 → story2, story1 → story3
      await authenticatedRequest(app, authToken)
        .post(`/api/stories/${story1.id}/dependencies`)
        .send({
          target_story_id: story2.id,
          link_type: 'IS_BLOCKED_BY',
        })
        .expect(201);

      await authenticatedRequest(app, authToken)
        .post(`/api/stories/${story1.id}/dependencies`)
        .send({
          target_story_id: story3.id,
          link_type: 'LINKED_TO',
        })
        .expect(201);

      // Add comments to story1
      await authenticatedRequest(app, authToken)
        .post(`/api/stories/${story1.id}/comments`)
        .send({ content: 'Comment 1' })
        .expect(201);

      await authenticatedRequest(app, authToken)
        .post(`/api/stories/${story1.id}/comments`)
        .send({ content: 'Comment 2' })
        .expect(201);

      // Delete story1
      const deleteResponse = await authenticatedRequest(app, authToken)
        .delete(`/api/stories/${story1.id}`)
        .expect(200);

      // Verify response includes dependencies_removed count
      expect(deleteResponse.body).toMatchObject({
        success: true,
        dependencies_removed: 2,
      });

      // Verify story1 is gone
      await authenticatedRequest(app, authToken)
        .get(`/api/stories/${story1.id}`)
        .expect(404);

      // Verify story2 and story3 still exist (not cascade deleted)
      await authenticatedRequest(app, authToken)
        .get(`/api/stories/${story2.id}`)
        .expect(200);

      await authenticatedRequest(app, authToken)
        .get(`/api/stories/${story3.id}`)
        .expect(200);

      // Verify comments are gone (cascade)
      const commentsResponse = await authenticatedRequest(app, authToken)
        .get(`/api/stories/${story1.id}/comments`);

      // Should either return 404 (story not found) or empty array
      if (commentsResponse.status === 200) {
        expect(commentsResponse.body).toEqual([]);
      } else {
        expect(commentsResponse.status).toBe(404);
      }
    });
  });

  describe('DELETE /api/tags/:id - Remove tag associations', () => {
    it('should delete tag but not the stories (only remove associations)', async () => {
      // Create journey, step, and release using factories
      const journey = await createJourney(app, authToken, storyMap.id, 'Test Journey');
      const step = await createStep(app, authToken, journey.id, 'Test Step');
      const release = await getUnassignedRelease(app, authToken, storyMap.id);

      // Create a tag using factory
      const tag = await createTag(app, authToken, storyMap.id);

      // Create stories using factories
      const story1 = await createStory(app, authToken, step.id, release.id, { title: 'Story 1' });
      const story2 = await createStory(app, authToken, step.id, release.id, { title: 'Story 2' });

      // Add tag to both stories
      await authenticatedRequest(app, authToken)
        .post(`/api/stories/${story1.id}/tags`)
        .send({ tag_id: tag.id })
        .expect(201);

      await authenticatedRequest(app, authToken)
        .post(`/api/stories/${story2.id}/tags`)
        .send({ tag_id: tag.id })
        .expect(201);

      // Delete the tag
      const deleteResponse = await authenticatedRequest(app, authToken)
        .delete(`/api/tags/${tag.id}`)
        .expect(200);

      // Verify response
      expect(deleteResponse.body).toMatchObject({
        success: true,
      });

      // Verify tag is gone
      await authenticatedRequest(app, authToken)
        .get(`/api/tags/${tag.id}`)
        .expect(404);

      // Verify stories still exist (NOT cascade deleted)
      await authenticatedRequest(app, authToken)
        .get(`/api/stories/${story1.id}`)
        .expect(200);

      await authenticatedRequest(app, authToken)
        .get(`/api/stories/${story2.id}`)
        .expect(200);

      // Verify tag associations are removed (StoryTag junction table cleaned up)
      const story1Tags = await authenticatedRequest(app, authToken)
        .get(`/api/stories/${story1.id}/tags`)
        .expect(200)
        .then(res => res.body);

      const story2Tags = await authenticatedRequest(app, authToken)
        .get(`/api/stories/${story2.id}/tags`)
        .expect(200)
        .then(res => res.body);

      expect(story1Tags).toEqual([]);
      expect(story2Tags).toEqual([]);
    });
  });

  describe('DELETE /api/personas/:id - Remove persona associations', () => {
    it('should delete persona but not the stories (only remove associations)', async () => {
      // Create journey, step, and release using factories
      const journey = await createJourney(app, authToken, storyMap.id, 'Test Journey');
      const step = await createStep(app, authToken, journey.id, 'Test Step');
      const release = await getUnassignedRelease(app, authToken, storyMap.id);

      // Create a persona using factory
      const persona = await createPersona(app, authToken, storyMap.id);

      // Create stories using factories
      const story1 = await createStory(app, authToken, step.id, release.id, { title: 'Story 1' });
      const story2 = await createStory(app, authToken, step.id, release.id, { title: 'Story 2' });

      // Add persona to both stories
      await authenticatedRequest(app, authToken)
        .post(`/api/stories/${story1.id}/personas`)
        .send({ persona_id: persona.id })
        .expect(201);

      await authenticatedRequest(app, authToken)
        .post(`/api/stories/${story2.id}/personas`)
        .send({ persona_id: persona.id })
        .expect(201);

      // Delete the persona
      const deleteResponse = await authenticatedRequest(app, authToken)
        .delete(`/api/personas/${persona.id}`)
        .expect(200);

      // Verify response
      expect(deleteResponse.body).toMatchObject({
        success: true,
      });

      // Verify persona is gone
      await authenticatedRequest(app, authToken)
        .get(`/api/personas/${persona.id}`)
        .expect(404);

      // Verify stories still exist (NOT cascade deleted)
      await authenticatedRequest(app, authToken)
        .get(`/api/stories/${story1.id}`)
        .expect(200);

      await authenticatedRequest(app, authToken)
        .get(`/api/stories/${story2.id}`)
        .expect(200);

      // Verify persona associations are removed (StoryPersona junction table cleaned up)
      const story1Personas = await authenticatedRequest(app, authToken)
        .get(`/api/stories/${story1.id}/personas`)
        .expect(200)
        .then(res => res.body);

      const story2Personas = await authenticatedRequest(app, authToken)
        .get(`/api/stories/${story2.id}/personas`)
        .expect(200)
        .then(res => res.body);

      expect(story1Personas).toEqual([]);
      expect(story2Personas).toEqual([]);
    });
  });
});
