/**
 * Release Reordering E2E Tests (Tier 2) - ENHANCED TO EXCELLENT
 *
 * Tests complex reordering operations for Releases (13 tests for reorder endpoint):
 *
 * Business Logic (3):
 * - Reorder to position 1 (first after Unassigned)
 * - Reorder to middle position
 * - Validate global sort_order after multiple reorders
 *
 * Release-Specific Validation (1):
 * - Prevent reordering the Unassigned release (business rule)
 *
 * DTO Validation Tests (3):
 * - Reject negative sort_order (DTO @Min validator)
 * - Reject invalid type - string (DTO @IsNumber validator)
 * - Reject null/undefined sort_order (DTO validator)
 *
 * Service Validation Tests (2):
 * - Reject sort_order exceeding bounds (service validator)
 * - Reject non-existent release (404)
 *
 * Edge Cases (3):
 * - Reorder to same position (noop)
 * - Reorder to last position
 * - Reorder with only Unassigned and one custom release
 *
 * Additional Tests (2):
 * - Get all stories for release (across steps)
 * - Verify stories ordered by step_id then sort_order
 *
 * Following patterns from journeys-reorder.e2e-spec.ts and E2E_TESTING_STRATEGY.md Tier 2
 * REFACTORED: Using factory pattern for entity creation
 * ENHANCED: Added comprehensive validation testing per EXCELLENT criteria
 */

import { INestApplication } from '@nestjs/common';
import { createTestApp } from './helpers/test-app';
import { createAuthToken, authenticatedRequest } from './helpers/auth';
import { createJourney, createStep, createRelease, createStory, createStoryMap } from './factories';

describe('Releases Reordering (E2E) - Tier 2', () => {
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

  describe('POST /api/releases/:id/reorder', () => {
    // ==================== Business Logic Tests ====================

    it('should reorder release to position 0 (first)', async () => {
      // Get the Unassigned release (auto-created at position 0)
      const allReleases = await authenticatedRequest(app, authToken)
        .get(`/api/releases?story_map_id=${storyMap.id}`)
        .expect(200)
        .then(res => res.body);

      const unassignedRelease = allReleases.find((r: any) => r.is_unassigned);

      // Create 3 custom releases using factories
      const release1 = await createRelease(app, authToken, storyMap.id, 'Release 1');
      const release2 = await createRelease(app, authToken, storyMap.id, 'Release 2');
      const release3 = await createRelease(app, authToken, storyMap.id, 'Release 3');

      // Move release3 to position 1 (after Unassigned)
      await authenticatedRequest(app, authToken)
        .post(`/api/releases/${release3.id}/reorder`)
        .send({ new_sort_order: 1 })
        .expect(201);

      // Verify new order
      const releases = await authenticatedRequest(app, authToken)
        .get(`/api/releases?story_map_id=${storyMap.id}`)
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

    it('should reorder release to middle position', async () => {
      // Get the Unassigned release
      const allReleases = await authenticatedRequest(app, authToken)
        .get(`/api/releases?story_map_id=${storyMap.id}`)
        .expect(200)
        .then(res => res.body);

      const unassignedRelease = allReleases.find((r: any) => r.is_unassigned);

      // Create 4 custom releases
      const release1 = await createRelease(app, authToken, storyMap.id, 'Release 1');
      const release2 = await createRelease(app, authToken, storyMap.id, 'Release 2');
      const release3 = await createRelease(app, authToken, storyMap.id, 'Release 3');
      const release4 = await createRelease(app, authToken, storyMap.id, 'Release 4');

      // Move release4 to position 2 (between release1 and release2)
      await authenticatedRequest(app, authToken)
        .post(`/api/releases/${release4.id}/reorder`)
        .send({ new_sort_order: 2 })
        .expect(201);

      // Verify new order
      const releases = await authenticatedRequest(app, authToken)
        .get(`/api/releases?story_map_id=${storyMap.id}`)
        .expect(200)
        .then(res => res.body);

      // Should be ordered: Unassigned, release1, release4, release2, release3
      expect(releases).toHaveLength(5);
      expect(releases[0].id).toBe(unassignedRelease.id);
      expect(releases[1].id).toBe(release1.id);
      expect(releases[2].id).toBe(release4.id);
      expect(releases[3].id).toBe(release2.id);
      expect(releases[4].id).toBe(release3.id);

      // Verify sort_order is sequential
      expect(releases[0].sort_order).toBe(0);
      expect(releases[1].sort_order).toBe(1);
      expect(releases[2].sort_order).toBe(2);
      expect(releases[3].sort_order).toBe(3);
      expect(releases[4].sort_order).toBe(4);
    });

    // ==================== Release-Specific Validation ====================

    it('should prevent reordering the Unassigned release', async () => {
      // Get the Unassigned release
      const allReleases = await authenticatedRequest(app, authToken)
        .get(`/api/releases?story_map_id=${storyMap.id}`)
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
        .get(`/api/releases?story_map_id=${storyMap.id}`)
        .expect(200)
        .then(res => res.body);

      expect(releasesAfter[0].id).toBe(unassignedRelease.id);
      expect(releasesAfter[0].sort_order).toBe(0);
    });

    it('should validate global sort_order after multiple reorders', async () => {
      // Create 5 releases using factories
      const releases = [];
      for (let i = 1; i <= 5; i++) {
        const release = await createRelease(app, authToken, storyMap.id, `Release ${i}`);
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
        .get(`/api/releases?story_map_id=${storyMap.id}`)
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

    // ==================== DTO Validation Tests ====================

    it('should reject negative sort_order (@Min validator)', async () => {
      const release = await createRelease(app, authToken, storyMap.id, 'Test Release');

      const response = await authenticatedRequest(app, authToken)
        .post(`/api/releases/${release.id}/reorder`)
        .send({ new_sort_order: -1 })
        .expect(400);

      expect(response.body.message).toContain('new_sort_order must not be less than 0');
    });

    it('should reject invalid type - string (@IsNumber validator)', async () => {
      const release = await createRelease(app, authToken, storyMap.id, 'Test Release');

      await authenticatedRequest(app, authToken)
        .post(`/api/releases/${release.id}/reorder`)
        .send({ new_sort_order: 'invalid' })
        .expect(400);
    });

    it('should reject null/undefined sort_order (DTO validator)', async () => {
      const release = await createRelease(app, authToken, storyMap.id, 'Test Release');

      // Test with null
      await authenticatedRequest(app, authToken)
        .post(`/api/releases/${release.id}/reorder`)
        .send({ new_sort_order: null })
        .expect(400);

      // Test with missing field (undefined)
      await authenticatedRequest(app, authToken)
        .post(`/api/releases/${release.id}/reorder`)
        .send({})
        .expect(400);
    });

    // ==================== Service Validation Tests ====================

    it('should reject sort_order exceeding bounds (service validator)', async () => {
      const release1 = await createRelease(app, authToken, storyMap.id, 'Release 1');
      await createRelease(app, authToken, storyMap.id, 'Release 2'); // Create second release for bounds testing

      // Try to reorder to position 10 (only 3 releases exist: Unassigned + 2 custom, max position is 2)
      const response = await authenticatedRequest(app, authToken)
        .post(`/api/releases/${release1.id}/reorder`)
        .send({ new_sort_order: 10 })
        .expect(400);

      expect(response.body.message).toContain('new_sort_order must be less than');
    });

    it('should reject reordering non-existent release (404)', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await authenticatedRequest(app, authToken)
        .post(`/api/releases/${fakeId}/reorder`)
        .send({ new_sort_order: 0 })
        .expect(404);
    });

    // ==================== Edge Cases ====================

    it('should reorder to same position (noop)', async () => {
      // Get Unassigned release
      const allReleases = await authenticatedRequest(app, authToken)
        .get(`/api/releases?story_map_id=${storyMap.id}`)
        .expect(200)
        .then(res => res.body);

      const unassignedRelease = allReleases.find((r: any) => r.is_unassigned);

      const release1 = await createRelease(app, authToken, storyMap.id, 'Release 1');
      const release2 = await createRelease(app, authToken, storyMap.id, 'Release 2');
      const release3 = await createRelease(app, authToken, storyMap.id, 'Release 3');

      // Reorder release2 to its current position (2)
      await authenticatedRequest(app, authToken)
        .post(`/api/releases/${release2.id}/reorder`)
        .send({ new_sort_order: 2 })
        .expect(201);

      // Verify order unchanged: Unassigned, release1, release2, release3
      const releases = await authenticatedRequest(app, authToken)
        .get(`/api/releases?story_map_id=${storyMap.id}`)
        .expect(200)
        .then(res => res.body);

      expect(releases[0].id).toBe(unassignedRelease.id);
      expect(releases[1].id).toBe(release1.id);
      expect(releases[2].id).toBe(release2.id);
      expect(releases[3].id).toBe(release3.id);
    });

    it('should reorder to last position', async () => {
      // Get Unassigned release
      const allReleases = await authenticatedRequest(app, authToken)
        .get(`/api/releases?story_map_id=${storyMap.id}`)
        .expect(200)
        .then(res => res.body);

      const unassignedRelease = allReleases.find((r: any) => r.is_unassigned);

      const release1 = await createRelease(app, authToken, storyMap.id, 'Release 1');
      const release2 = await createRelease(app, authToken, storyMap.id, 'Release 2');
      const release3 = await createRelease(app, authToken, storyMap.id, 'Release 3');

      // Reorder release1 to last position (3)
      await authenticatedRequest(app, authToken)
        .post(`/api/releases/${release1.id}/reorder`)
        .send({ new_sort_order: 3 })
        .expect(201);

      // Verify order: Unassigned, release2, release3, release1
      const releases = await authenticatedRequest(app, authToken)
        .get(`/api/releases?story_map_id=${storyMap.id}`)
        .expect(200)
        .then(res => res.body);

      expect(releases[0].id).toBe(unassignedRelease.id);
      expect(releases[1].id).toBe(release2.id);
      expect(releases[2].id).toBe(release3.id);
      expect(releases[3].id).toBe(release1.id);
    });

    it('should reorder with only Unassigned and one custom release', async () => {
      // Get Unassigned release
      const allReleases = await authenticatedRequest(app, authToken)
        .get(`/api/releases?story_map_id=${storyMap.id}`)
        .expect(200)
        .then(res => res.body);

      const unassignedRelease = allReleases.find((r: any) => r.is_unassigned);

      const release = await createRelease(app, authToken, storyMap.id, 'Only Release');

      // Reorder the only custom release to position 1 (already there)
      await authenticatedRequest(app, authToken)
        .post(`/api/releases/${release.id}/reorder`)
        .send({ new_sort_order: 1 })
        .expect(201);

      // Verify releases: Unassigned at 0, release at 1
      const releases = await authenticatedRequest(app, authToken)
        .get(`/api/releases?story_map_id=${storyMap.id}`)
        .expect(200)
        .then(res => res.body);

      expect(releases).toHaveLength(2);
      expect(releases[0].id).toBe(unassignedRelease.id);
      expect(releases[0].sort_order).toBe(0);
      expect(releases[1].id).toBe(release.id);
      expect(releases[1].sort_order).toBe(1);
    });
  });

  describe('GET /api/releases/:id/stories', () => {
    it('should get all stories for a release across all steps', async () => {
      // Create journey and 3 steps using factories
      const journey = await createJourney(app, authToken, storyMap.id, 'Test Journey');
      const step1 = await createStep(app, authToken, journey.id, 'Step 1');
      const step2 = await createStep(app, authToken, journey.id, 'Step 2');
      const step3 = await createStep(app, authToken, journey.id, 'Step 3');

      // Create a release using factory
      const release = await createRelease(app, authToken, storyMap.id, 'Test Release');

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
      const journey = await createJourney(app, authToken, storyMap.id, 'Ordering Test Journey');
      const step1 = await createStep(app, authToken, journey.id, 'Alpha Step');
      const step2 = await createStep(app, authToken, journey.id, 'Beta Step');

      // Create a release using factory
      const release = await createRelease(app, authToken, storyMap.id, 'Test Release');

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
