/**
 * Multi-Entity Workflows E2E Tests (Tier 2.7)
 *
 * Tests end-to-end workflows across multiple entities:
 * - Create complete story map (journey → steps → releases → stories)
 * - Add tags and personas to existing story
 * - Move story and verify all associations intact
 * - Delete journey and verify all nested entities removed
 *
 * Following patterns from E2E_TESTING_STRATEGY.md Tier 2.7
 * REFACTORED: Using factory pattern for entity creation
 */

import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './helpers/test-app';
import { createAuthToken, authenticatedRequest } from './helpers/auth';
import {
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

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    authToken = await createAuthToken(app);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Complete Story Map Creation', () => {
    it('should create complete story map (journey → steps → releases → stories)', async () => {
      // Step 1: Create journey using factory
      const journey = await createJourney(app, authToken, 'User Onboarding Journey');

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
      const mvp = await createRelease(app, authToken, 'MVP');
      const v2 = await createRelease(app, authToken, 'V2');

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
      const journey = await createJourney(app, authToken, 'Test Journey');
      const step = await createStep(app, authToken, journey.id, 'Test Step');
      const release = await createRelease(app, authToken, 'Test Release');
      const story = await createStory(app, authToken, step.id, release.id, {
        title: 'Feature Story',
      });

      // Create tags using factories
      const tag1 = await createTag(app, authToken);
      const tag2 = await createTag(app, authToken, 'Important');

      // Create personas using factories
      const persona1 = await createPersona(app, authToken);
      const persona2 = await createPersona(app, authToken, 'Admin User');

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
      const journey = await createJourney(app, authToken, 'Test Journey');
      const step1 = await createStep(app, authToken, journey.id, 'Step 1');
      const step2 = await createStep(app, authToken, journey.id, 'Step 2');
      const release1 = await createRelease(app, authToken, 'Release 1');
      const release2 = await createRelease(app, authToken, 'Release 2');

      // Create story with associations using factories
      const story = await createStory(app, authToken, step1.id, release1.id, {
        title: 'Movable Story',
      });

      const tag = await createTag(app, authToken, 'Test Tag');
      const persona = await createPersona(app, authToken, 'Test Persona');

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
      const journey = await createJourney(app, authToken, 'Journey to Delete');
      const step1 = await createStep(app, authToken, journey.id, 'Step 1');
      const step2 = await createStep(app, authToken, journey.id, 'Step 2');
      const release = await createRelease(app, authToken, 'Test Release');

      const story1 = await createStory(app, authToken, step1.id, release.id, {
        title: 'Story 1',
      });

      const story2 = await createStory(app, authToken, step2.id, release.id, {
        title: 'Story 2',
      });

      // Delete journey
      const deleteResponse = await authenticatedRequest(app, authToken)
        .delete(`/api/journeys/${journey.id}`)
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
});
