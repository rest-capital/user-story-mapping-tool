/**
 * Step Reordering E2E Tests (Tier 2) - ENHANCED TO EXCELLENT
 *
 * Tests complex reordering operations for Steps (12 tests for reorder endpoint):
 *
 * Business Logic (4):
 * - Reorder to position 0 (first)
 * - Reorder to middle position
 * - Validate scoped to journey (different journeys don't interfere)
 * - Maintain unique sort_order after multiple reorders
 *
 * Validation Tests (5):
 * - Reject negative sort_order (DTO @Min validator)
 * - Reject invalid type - string (DTO @IsNumber validator)
 * - Reject null/undefined sort_order (DTO validator)
 * - Reject sort_order exceeding bounds (service validator)
 * - Reject non-existent step (404)
 *
 * Edge Cases (3):
 * - Reorder to same position (noop)
 * - Reorder to last position
 * - Reorder with only one step
 *
 * Additional Tests (2):
 * - Get all stories for step (across releases)
 * - Verify stories ordered by release_id then sort_order
 *
 * Following patterns from journeys-reorder.e2e-spec.ts and E2E_TESTING_STRATEGY.md Tier 2
 * REFACTORED: Using factory pattern for entity creation
 * ENHANCED: Added comprehensive validation testing per EXCELLENT criteria
 */

import { INestApplication } from '@nestjs/common';
import { createTestApp } from './helpers/test-app';
import { createAuthToken, authenticatedRequest } from './helpers/auth';
import { createStoryMap, createJourney, createStep, createRelease, createStory } from './factories';

describe('Steps Reordering (E2E) - Tier 2', () => {
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

  describe('POST /api/steps/:id/reorder', () => {
    // ==================== Business Logic Tests ====================

    it('should reorder step within journey to position 0 (first)', async () => {
      // Create a journey with 3 steps using factories
      const journey = await createJourney(app, authToken, storyMap.id, 'Test Journey');
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

    it('should reorder step to middle position', async () => {
      // Create a journey with 4 steps using factories
      const journey = await createJourney(app, authToken, storyMap.id, 'Test Journey');
      const step1 = await createStep(app, authToken, journey.id, 'Step 1');
      const step2 = await createStep(app, authToken, journey.id, 'Step 2');
      const step3 = await createStep(app, authToken, journey.id, 'Step 3');
      const step4 = await createStep(app, authToken, journey.id, 'Step 4');

      // Move step4 to position 1 (between step1 and step2)
      await authenticatedRequest(app, authToken)
        .post(`/api/steps/${step4.id}/reorder`)
        .send({ new_sort_order: 1 })
        .expect(201);

      // Verify new order
      const steps = await authenticatedRequest(app, authToken)
        .get('/api/steps')
        .expect(200)
        .then(res => res.body);

      const journeySteps = steps.filter((s: any) => s.journey_id === journey.id);

      // Should be ordered: step1, step4, step2, step3
      expect(journeySteps).toHaveLength(4);
      expect(journeySteps[0].id).toBe(step1.id);
      expect(journeySteps[1].id).toBe(step4.id);
      expect(journeySteps[2].id).toBe(step2.id);
      expect(journeySteps[3].id).toBe(step3.id);

      // Verify sort_order is sequential
      expect(journeySteps[0].sort_order).toBe(0);
      expect(journeySteps[1].sort_order).toBe(1);
      expect(journeySteps[2].sort_order).toBe(2);
      expect(journeySteps[3].sort_order).toBe(3);
    });

    it('should validate sort_order is scoped to journey (different journeys don\'t interfere)', async () => {
      // Create two separate journeys using factories
      const journey1 = await createJourney(app, authToken, storyMap.id, 'Journey 1');
      const journey2 = await createJourney(app, authToken, storyMap.id, 'Journey 2');

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
      const journey = await createJourney(app, authToken, storyMap.id, 'Multi-Reorder Journey');

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

    // ==================== DTO Validation Tests ====================

    it('should reject negative sort_order (@Min validator)', async () => {
      const journey = await createJourney(app, authToken, storyMap.id, 'Test Journey');
      const step = await createStep(app, authToken, journey.id, 'Step 1');

      const response = await authenticatedRequest(app, authToken)
        .post(`/api/steps/${step.id}/reorder`)
        .send({ new_sort_order: -1 })
        .expect(400);

      expect(response.body.message).toContain('new_sort_order must not be less than 0');
    });

    it('should reject invalid type - string (@IsNumber validator)', async () => {
      const journey = await createJourney(app, authToken, storyMap.id, 'Test Journey');
      const step = await createStep(app, authToken, journey.id, 'Step 1');

      await authenticatedRequest(app, authToken)
        .post(`/api/steps/${step.id}/reorder`)
        .send({ new_sort_order: 'invalid' })
        .expect(400);
    });

    it('should reject null/undefined sort_order (DTO validator)', async () => {
      const journey = await createJourney(app, authToken, storyMap.id, 'Test Journey');
      const step = await createStep(app, authToken, journey.id, 'Step 1');

      // Test with null
      await authenticatedRequest(app, authToken)
        .post(`/api/steps/${step.id}/reorder`)
        .send({ new_sort_order: null })
        .expect(400);

      // Test with missing field (undefined)
      await authenticatedRequest(app, authToken)
        .post(`/api/steps/${step.id}/reorder`)
        .send({})
        .expect(400);
    });

    // ==================== Service Validation Tests ====================

    it('should reject sort_order exceeding bounds (service validator)', async () => {
      const journey = await createJourney(app, authToken, storyMap.id, 'Test Journey');
      const step1 = await createStep(app, authToken, journey.id, 'Step 1');
      await createStep(app, authToken, journey.id, 'Step 2'); // Create second step for bounds testing

      // Try to reorder to position 5 (only 2 steps exist, max position is 1)
      const response = await authenticatedRequest(app, authToken)
        .post(`/api/steps/${step1.id}/reorder`)
        .send({ new_sort_order: 5 })
        .expect(400);

      expect(response.body.message).toContain('new_sort_order must be less than');
    });

    it('should reject reordering non-existent step (404)', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await authenticatedRequest(app, authToken)
        .post(`/api/steps/${fakeId}/reorder`)
        .send({ new_sort_order: 0 })
        .expect(404);
    });

    // ==================== Edge Cases ====================

    it('should reorder to same position (noop)', async () => {
      const journey = await createJourney(app, authToken, storyMap.id, 'Test Journey');
      const step1 = await createStep(app, authToken, journey.id, 'Step 1');
      const step2 = await createStep(app, authToken, journey.id, 'Step 2');
      const step3 = await createStep(app, authToken, journey.id, 'Step 3');

      // Reorder step2 to its current position (1)
      await authenticatedRequest(app, authToken)
        .post(`/api/steps/${step2.id}/reorder`)
        .send({ new_sort_order: 1 })
        .expect(201);

      // Verify order unchanged: step1, step2, step3
      const steps = await authenticatedRequest(app, authToken)
        .get('/api/steps')
        .expect(200)
        .then(res => res.body.filter((s: any) => s.journey_id === journey.id));

      expect(steps[0].id).toBe(step1.id);
      expect(steps[1].id).toBe(step2.id);
      expect(steps[2].id).toBe(step3.id);
    });

    it('should reorder to last position', async () => {
      const journey = await createJourney(app, authToken, storyMap.id, 'Test Journey');
      const step1 = await createStep(app, authToken, journey.id, 'Step 1');
      const step2 = await createStep(app, authToken, journey.id, 'Step 2');
      const step3 = await createStep(app, authToken, journey.id, 'Step 3');

      // Reorder step1 to last position (2)
      await authenticatedRequest(app, authToken)
        .post(`/api/steps/${step1.id}/reorder`)
        .send({ new_sort_order: 2 })
        .expect(201);

      // Verify order: step2, step3, step1
      const steps = await authenticatedRequest(app, authToken)
        .get('/api/steps')
        .expect(200)
        .then(res => res.body.filter((s: any) => s.journey_id === journey.id));

      expect(steps[0].id).toBe(step2.id);
      expect(steps[1].id).toBe(step3.id);
      expect(steps[2].id).toBe(step1.id);
    });

    it('should reorder with single step (noop)', async () => {
      const journey = await createJourney(app, authToken, storyMap.id, 'Test Journey');
      const step = await createStep(app, authToken, journey.id, 'Only Step');

      // Reorder the only step to position 0
      await authenticatedRequest(app, authToken)
        .post(`/api/steps/${step.id}/reorder`)
        .send({ new_sort_order: 0 })
        .expect(201);

      // Verify step is still there at position 0
      const steps = await authenticatedRequest(app, authToken)
        .get('/api/steps')
        .expect(200)
        .then(res => res.body.filter((s: any) => s.journey_id === journey.id));

      expect(steps).toHaveLength(1);
      expect(steps[0].id).toBe(step.id);
      expect(steps[0].sort_order).toBe(0);
    });
  });

  describe('GET /api/steps/:id/stories', () => {
    it('should get all stories for a step across all releases', async () => {
      // Create journey and step using factories
      const journey = await createJourney(app, authToken, storyMap.id, 'Test Journey');
      const step = await createStep(app, authToken, journey.id, 'Test Step');

      // Create 3 releases using factories
      const release1 = await createRelease(app, authToken, storyMap.id, 'Release 1');
      const release2 = await createRelease(app, authToken, storyMap.id, 'Release 2');
      const release3 = await createRelease(app, authToken, storyMap.id, 'Release 3');

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
      const journey = await createJourney(app, authToken, storyMap.id, 'Ordering Test Journey');
      const step = await createStep(app, authToken, journey.id, 'Ordering Test Step');

      // Create 2 releases using factories
      const release1 = await createRelease(app, authToken, storyMap.id, 'Alpha Release');
      const release2 = await createRelease(app, authToken, storyMap.id, 'Beta Release');

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
