/**
 * Step Reordering E2E Tests (Tier 2)
 *
 * Tests complex reordering operations for Steps:
 * - Reorder step within journey
 * - Validate sort_order scoped to journey (steps in different journeys don't interfere)
 * - Multiple reorders maintain consistency
 * - Get all stories for step (across releases)
 * - Verify stories ordered by sort_order
 *
 * Following patterns from journeys-reorder.e2e-spec.ts and E2E_TESTING_STRATEGY.md Tier 2
 * REFACTORED: Using factory pattern for entity creation
 */

import { INestApplication } from '@nestjs/common';
import { createTestApp } from './helpers/test-app';
import { createAuthToken, authenticatedRequest } from './helpers/auth';
import { createJourney, createStep, createRelease, createStory } from './factories';

describe('Steps Reordering (E2E) - Tier 2', () => {
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

  describe('POST /api/steps/:id/reorder', () => {
    it('should reorder step within journey to position 0 (first)', async () => {
      // Create a journey with 3 steps using factories
      const journey = await createJourney(app, authToken, 'Test Journey');
      const step1 = await createStep(app, authToken, journey.id, 'Step 1');
      const step2 = await createStep(app, authToken, journey.id, 'Step 2');
      const step3 = await createStep(app, authToken, journey.id, 'Step 3');

      // Move step3 to position 0
      await authenticatedRequest(app, authToken)
        .post(`/api/steps/${step3.id}/reorder`)
        .send({ new_sort_order: 0 })
        .expect(201); // Backend returns 201 for reorder

      // Verify new order by getting all steps in the journey
      const steps = await authenticatedRequest(app, authToken)
        .get('/api/steps')
        .expect(200)
        .then(res => res.body);

      // Filter steps for this journey only
      const journeySteps = steps.filter((s: any) => s.journey_id === journey.id);

      // Should be ordered: step3, step1, step2
      expect(journeySteps).toHaveLength(3);
      expect(journeySteps[0].id).toBe(step3.id);
      expect(journeySteps[1].id).toBe(step1.id);
      expect(journeySteps[2].id).toBe(step2.id);

      // Verify sort_order is 0-based and sequential
      expect(journeySteps[0].sort_order).toBe(0);
      expect(journeySteps[1].sort_order).toBe(1);
      expect(journeySteps[2].sort_order).toBe(2);
    });

    it('should validate sort_order is scoped to journey (different journeys don\'t interfere)', async () => {
      // Create two separate journeys using factories
      const journey1 = await createJourney(app, authToken, 'Journey 1');
      const journey2 = await createJourney(app, authToken, 'Journey 2');

      // Create 2 steps in journey1
      const j1step1 = await createStep(app, authToken, journey1.id, 'J1 Step 1');
      const j1step2 = await createStep(app, authToken, journey1.id, 'J1 Step 2');

      // Create 2 steps in journey2
      const j2step1 = await createStep(app, authToken, journey2.id, 'J2 Step 1');
      const j2step2 = await createStep(app, authToken, journey2.id, 'J2 Step 2');

      // Reorder step in journey1
      await authenticatedRequest(app, authToken)
        .post(`/api/steps/${j1step2.id}/reorder`)
        .send({ new_sort_order: 0 })
        .expect(201);

      // Verify journey1 steps are reordered
      const allSteps = await authenticatedRequest(app, authToken)
        .get('/api/steps')
        .expect(200)
        .then(res => res.body);

      const journey1Steps = allSteps.filter((s: any) => s.journey_id === journey1.id);
      const journey2Steps = allSteps.filter((s: any) => s.journey_id === journey2.id);

      // Journey1 should be reordered: j1step2, j1step1
      expect(journey1Steps).toHaveLength(2);
      expect(journey1Steps[0].id).toBe(j1step2.id);
      expect(journey1Steps[1].id).toBe(j1step1.id);
      expect(journey1Steps[0].sort_order).toBe(0);
      expect(journey1Steps[1].sort_order).toBe(1);

      // Journey2 should be UNCHANGED: j2step1, j2step2
      expect(journey2Steps).toHaveLength(2);
      expect(journey2Steps[0].id).toBe(j2step1.id);
      expect(journey2Steps[1].id).toBe(j2step2.id);
      expect(journey2Steps[0].sort_order).toBe(0);
      expect(journey2Steps[1].sort_order).toBe(1);
    });

    it('should maintain unique sort_order after multiple reorders within journey', async () => {
      // Create a journey using factory
      const journey = await createJourney(app, authToken, 'Multi-Reorder Journey');

      // Create 5 steps using factories
      const steps = [];
      for (let i = 1; i <= 5; i++) {
        const step = await createStep(app, authToken, journey.id, `Step ${i}`);
        steps.push(step);
      }

      // Perform multiple reorders
      // Move step 5 to position 0
      await authenticatedRequest(app, authToken)
        .post(`/api/steps/${steps[4].id}/reorder`)
        .send({ new_sort_order: 0 })
        .expect(201);

      // Move step 1 to position 3
      await authenticatedRequest(app, authToken)
        .post(`/api/steps/${steps[0].id}/reorder`)
        .send({ new_sort_order: 3 })
        .expect(201);

      // Fetch all steps and verify
      const allSteps = await authenticatedRequest(app, authToken)
        .get('/api/steps')
        .expect(200)
        .then(res => res.body);

      const journeySteps = allSteps.filter((s: any) => s.journey_id === journey.id);

      // Verify all sort_orders are unique and sequential (0-based)
      const sortOrders = journeySteps.map((s: any) => s.sort_order);
      const uniqueSortOrders = new Set(sortOrders);

      expect(uniqueSortOrders.size).toBe(sortOrders.length); // All unique
      expect(Math.min(...sortOrders)).toBe(0); // Starts at 0
      expect(Math.max(...sortOrders)).toBe(sortOrders.length - 1); // Ends at length-1
    });
  });

  describe('GET /api/steps/:id/stories', () => {
    it('should get all stories for a step across all releases', async () => {
      // Create journey and step using factories
      const journey = await createJourney(app, authToken, 'Test Journey');
      const step = await createStep(app, authToken, journey.id, 'Test Step');

      // Create 3 releases using factories
      const release1 = await createRelease(app, authToken, 'Release 1');
      const release2 = await createRelease(app, authToken, 'Release 2');
      const release3 = await createRelease(app, authToken, 'Release 3');

      // Create stories in different releases for the same step using factories
      await createStory(app, authToken, step.id, release1.id, { title: 'Story R1-1' });
      await createStory(app, authToken, step.id, release1.id, { title: 'Story R1-2' });
      await createStory(app, authToken, step.id, release2.id, { title: 'Story R2-1' });
      await createStory(app, authToken, step.id, release3.id, { title: 'Story R3-1' });
      await createStory(app, authToken, step.id, release3.id, { title: 'Story R3-2' });

      // Get all stories for the step
      const stories = await authenticatedRequest(app, authToken)
        .get(`/api/steps/${step.id}/stories`)
        .expect(200)
        .then(res => res.body);

      // Verify we got all 5 stories
      expect(stories).toHaveLength(5);

      // Verify all stories belong to the correct step
      stories.forEach((story: any) => {
        expect(story.step_id).toBe(step.id);
      });

      // Verify stories span multiple releases
      const releaseIds = stories.map((s: any) => s.release_id);
      const uniqueReleases = new Set(releaseIds);
      expect(uniqueReleases.size).toBeGreaterThan(1);
    });

    it('should return stories ordered by release_id then sort_order', async () => {
      // Create journey and step using factories
      const journey = await createJourney(app, authToken, 'Ordering Test Journey');
      const step = await createStep(app, authToken, journey.id, 'Ordering Test Step');

      // Create 2 releases using factories
      const release1 = await createRelease(app, authToken, 'Alpha Release');
      const release2 = await createRelease(app, authToken, 'Beta Release');

      // Create stories in reverse order (release2 first) to test ordering using factories
      await createStory(app, authToken, step.id, release2.id, { title: 'Story R2-1' });
      await createStory(app, authToken, step.id, release2.id, { title: 'Story R2-2' });
      await createStory(app, authToken, step.id, release1.id, { title: 'Story R1-1' });
      await createStory(app, authToken, step.id, release1.id, { title: 'Story R1-2' });

      // Get all stories for the step
      const stories = await authenticatedRequest(app, authToken)
        .get(`/api/steps/${step.id}/stories`)
        .expect(200)
        .then(res => res.body);

      // Verify ordering: grouped by release_id (asc), then by sort_order (asc)
      expect(stories).toHaveLength(4);

      // Verify consecutive stories with same release_id are grouped together
      for (let i = 1; i < stories.length; i++) {
        if (stories[i].release_id === stories[i-1].release_id) {
          // Same release - verify sort_order is ascending
          expect(stories[i].sort_order).toBeGreaterThanOrEqual(stories[i-1].sort_order);
        }
      }

      // Verify stories are grouped by release (no interleaving)
      const seenReleases = new Set();
      let currentReleaseId = null;
      for (const story of stories) {
        if (story.release_id !== currentReleaseId) {
          // Switching to a new release
          if (seenReleases.has(story.release_id)) {
            // We've seen this release before - this means releases are interleaved (bad!)
            fail('Stories should be grouped by release_id without interleaving');
          }
          seenReleases.add(story.release_id);
          currentReleaseId = story.release_id;
        }
      }
    });
  });
});
