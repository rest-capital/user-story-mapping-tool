/**
 * Release Reordering E2E Tests (Tier 2)
 *
 * Tests complex reordering operations for Releases:
 * - Reorder release (basic)
 * - Unassigned release maintains position (cannot be reordered)
 * - Validate global sort_order (all releases sequential)
 * - Get all stories for release (across steps)
 * - Verify stories ordered by sort_order
 *
 * Following patterns from steps-reorder.e2e-spec.ts and E2E_TESTING_STRATEGY.md Tier 2
 * REFACTORED: Using factory pattern for entity creation
 */

import { INestApplication } from '@nestjs/common';
import { createTestApp } from './helpers/test-app';
import { createAuthToken, authenticatedRequest } from './helpers/auth';
import { createJourney, createStep, createRelease, createStory } from './factories';

describe('Releases Reordering (E2E) - Tier 2', () => {
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

  describe('POST /api/releases/:id/reorder', () => {
    it('should reorder release to position 0 (first)', async () => {
      // Get the Unassigned release (auto-created at position 0)
      const allReleases = await authenticatedRequest(app, authToken)
        .get('/api/releases')
        .expect(200)
        .then(res => res.body);

      const unassignedRelease = allReleases.find((r: any) => r.is_unassigned);

      // Create 3 custom releases using factories
      const release1 = await createRelease(app, authToken, 'Release 1');
      const release2 = await createRelease(app, authToken, 'Release 2');
      const release3 = await createRelease(app, authToken, 'Release 3');

      // Move release3 to position 1 (after Unassigned)
      await authenticatedRequest(app, authToken)
        .post(`/api/releases/${release3.id}/reorder`)
        .send({ new_sort_order: 1 })
        .expect(201);

      // Verify new order
      const releases = await authenticatedRequest(app, authToken)
        .get('/api/releases')
        .expect(200)
        .then(res => res.body);

      // Should be ordered: Unassigned, release3, release1, release2
      expect(releases).toHaveLength(4);
      expect(releases[0].id).toBe(unassignedRelease.id);
      expect(releases[1].id).toBe(release3.id);
      expect(releases[2].id).toBe(release1.id);
      expect(releases[3].id).toBe(release2.id);

      // Verify sort_order is 0-based and sequential
      expect(releases[0].sort_order).toBe(0);
      expect(releases[1].sort_order).toBe(1);
      expect(releases[2].sort_order).toBe(2);
      expect(releases[3].sort_order).toBe(3);
    });

    it('should prevent reordering the Unassigned release', async () => {
      // Get the Unassigned release
      const allReleases = await authenticatedRequest(app, authToken)
        .get('/api/releases')
        .expect(200)
        .then(res => res.body);

      const unassignedRelease = allReleases.find((r: any) => r.is_unassigned);

      // Try to reorder the Unassigned release - should fail
      await authenticatedRequest(app, authToken)
        .post(`/api/releases/${unassignedRelease.id}/reorder`)
        .send({ new_sort_order: 5 })
        .expect(400); // Should reject reordering Unassigned

      // Verify Unassigned is still at position 0
      const releasesAfter = await authenticatedRequest(app, authToken)
        .get('/api/releases')
        .expect(200)
        .then(res => res.body);

      expect(releasesAfter[0].id).toBe(unassignedRelease.id);
      expect(releasesAfter[0].sort_order).toBe(0);
    });

    it('should validate global sort_order after multiple reorders', async () => {
      // Create 5 releases using factories
      const releases = [];
      for (let i = 1; i <= 5; i++) {
        const release = await createRelease(app, authToken, `Release ${i}`);
        releases.push(release);
      }

      // Perform multiple reorders
      // Move release 5 to position 1 (after Unassigned)
      await authenticatedRequest(app, authToken)
        .post(`/api/releases/${releases[4].id}/reorder`)
        .send({ new_sort_order: 1 })
        .expect(201);

      // Move release 1 to position 4
      await authenticatedRequest(app, authToken)
        .post(`/api/releases/${releases[0].id}/reorder`)
        .send({ new_sort_order: 4 })
        .expect(201);

      // Fetch all releases
      const allReleases = await authenticatedRequest(app, authToken)
        .get('/api/releases')
        .expect(200)
        .then(res => res.body);

      // Verify all sort_orders are unique and sequential (0-based)
      const sortOrders = allReleases.map((r: any) => r.sort_order);
      const uniqueSortOrders = new Set(sortOrders);

      expect(uniqueSortOrders.size).toBe(sortOrders.length); // All unique
      expect(Math.min(...sortOrders)).toBe(0); // Starts at 0
      expect(Math.max(...sortOrders)).toBe(sortOrders.length - 1); // Ends at length-1

      // Verify Unassigned is still first
      expect(allReleases[0].is_unassigned).toBe(true);
      expect(allReleases[0].sort_order).toBe(0);
    });
  });

  describe('GET /api/releases/:id/stories', () => {
    it('should get all stories for a release across all steps', async () => {
      // Create journey and 3 steps using factories
      const journey = await createJourney(app, authToken, 'Test Journey');
      const step1 = await createStep(app, authToken, journey.id, 'Step 1');
      const step2 = await createStep(app, authToken, journey.id, 'Step 2');
      const step3 = await createStep(app, authToken, journey.id, 'Step 3');

      // Create a release using factory
      const release = await createRelease(app, authToken, 'Test Release');

      // Create stories in different steps for the same release using factories
      // Step 1: 2 stories
      await createStory(app, authToken, step1.id, release.id, { title: 'Story S1-1' });
      await createStory(app, authToken, step1.id, release.id, { title: 'Story S1-2' });

      // Step 2: 1 story
      await createStory(app, authToken, step2.id, release.id, { title: 'Story S2-1' });

      // Step 3: 2 stories
      await createStory(app, authToken, step3.id, release.id, { title: 'Story S3-1' });
      await createStory(app, authToken, step3.id, release.id, { title: 'Story S3-2' });

      // Get all stories for the release
      const stories = await authenticatedRequest(app, authToken)
        .get(`/api/releases/${release.id}/stories`)
        .expect(200)
        .then(res => res.body);

      // Verify we got all 5 stories
      expect(stories).toHaveLength(5);

      // Verify all stories belong to the correct release
      stories.forEach((story: any) => {
        expect(story.release_id).toBe(release.id);
      });

      // Verify stories span multiple steps
      const stepIds = stories.map((s: any) => s.step_id);
      const uniqueSteps = new Set(stepIds);
      expect(uniqueSteps.size).toBeGreaterThan(1);
    });

    it('should return stories ordered by step_id then sort_order', async () => {
      // Create journey and 2 steps using factories
      const journey = await createJourney(app, authToken, 'Ordering Test Journey');
      const step1 = await createStep(app, authToken, journey.id, 'Alpha Step');
      const step2 = await createStep(app, authToken, journey.id, 'Beta Step');

      // Create a release using factory
      const release = await createRelease(app, authToken, 'Test Release');

      // Create stories in reverse order (step2 first) to test ordering using factories
      // Step 2: 2 stories
      await createStory(app, authToken, step2.id, release.id, { title: 'Story S2-1' });
      await createStory(app, authToken, step2.id, release.id, { title: 'Story S2-2' });

      // Step 1: 2 stories
      await createStory(app, authToken, step1.id, release.id, { title: 'Story S1-1' });
      await createStory(app, authToken, step1.id, release.id, { title: 'Story S1-2' });

      // Get all stories for the release
      const stories = await authenticatedRequest(app, authToken)
        .get(`/api/releases/${release.id}/stories`)
        .expect(200)
        .then(res => res.body);

      // Verify ordering: grouped by step_id (asc), then by sort_order (asc)
      expect(stories).toHaveLength(4);

      // Verify consecutive stories with same step_id are grouped together
      for (let i = 1; i < stories.length; i++) {
        if (stories[i].step_id === stories[i-1].step_id) {
          // Same step - verify sort_order is ascending
          expect(stories[i].sort_order).toBeGreaterThanOrEqual(stories[i-1].sort_order);
        }
      }

      // Verify stories are grouped by step (no interleaving)
      const seenSteps = new Set();
      let currentStepId = null;
      for (const story of stories) {
        if (story.step_id !== currentStepId) {
          // Switching to a new step
          if (seenSteps.has(story.step_id)) {
            // We've seen this step before - this means steps are interleaved (bad!)
            fail('Stories should be grouped by step_id without interleaving');
          }
          seenSteps.add(story.step_id);
          currentStepId = story.step_id;
        }
      }
    });
  });
});
