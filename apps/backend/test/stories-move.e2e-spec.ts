/**
 * Story Moving E2E Tests (Tier 2)
 *
 * Tests complex story moving operations:
 * - Move story to different cell (step + release)
 * - Auto-recalculate sort_order in target cell
 * - Move to different step (same release)
 * - Move to different release (same step)
 * - Move to completely different cell
 * - Verify 1000-spacing maintained in target
 *
 * Following patterns from E2E_TESTING_STRATEGY.md Tier 2.4
 * REFACTORED: Using factory pattern for entity creation
 */

import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './helpers/test-app';
import { createAuthToken, authenticatedRequest } from './helpers/auth';
import { createJourney, createStep, createRelease, createStory } from './factories';

describe('Stories Moving (E2E) - Tier 2', () => {
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

  describe('POST /api/stories/:id/move', () => {
    it('should move story to different cell with proper sort_order', async () => {
      // Create journey with 2 steps using factories
      const journey = await createJourney(app, authToken, 'Test Journey');
      const step1 = await createStep(app, authToken, journey.id, 'Step 1');
      const step2 = await createStep(app, authToken, journey.id, 'Step 2');

      // Create 2 releases using factories
      const release1 = await createRelease(app, authToken, 'Release 1');
      const release2 = await createRelease(app, authToken, 'Release 2');

      // Create story in cell (step1, release1) using factory
      const story = await createStory(app, authToken, step1.id, release1.id, {
        title: 'Story to Move',
      });

      // Verify initial position
      expect(story.step_id).toBe(step1.id);
      expect(story.release_id).toBe(release1.id);

      // Move to cell (step2, release2)
      const movedStory = await authenticatedRequest(app, authToken)
        .post(`/api/stories/${story.id}/move`)
        .send({
          step_id: step2.id,
          release_id: release2.id,
        })
        .expect(201)
        .then(res => res.body);

      // Verify new position
      expect(movedStory.id).toBe(story.id);
      expect(movedStory.step_id).toBe(step2.id);
      expect(movedStory.release_id).toBe(release2.id);
      expect(movedStory.sort_order).toBe(1000); // First story in new cell
    });

    it('should auto-recalculate sort_order when moving to populated cell', async () => {
      // Create journey and step using factories
      const journey = await createJourney(app, authToken, 'Test Journey');
      const step = await createStep(app, authToken, journey.id, 'Test Step');

      // Create 2 releases using factories
      const release1 = await createRelease(app, authToken, 'Release 1');
      const release2 = await createRelease(app, authToken, 'Release 2');

      // Create 3 stories in target cell (step, release2) using factories
      const targetStory1 = await createStory(app, authToken, step.id, release2.id, {
        title: 'Target Story 1',
      });
      const targetStory2 = await createStory(app, authToken, step.id, release2.id, {
        title: 'Target Story 2',
      });
      const targetStory3 = await createStory(app, authToken, step.id, release2.id, {
        title: 'Target Story 3',
      });

      // Verify target cell has 3 stories with 1000-spacing
      expect(targetStory1.sort_order).toBe(1000);
      expect(targetStory2.sort_order).toBe(2000);
      expect(targetStory3.sort_order).toBe(3000);

      // Create story to move in different cell using factory
      const storyToMove = await createStory(app, authToken, step.id, release1.id, {
        title: 'Story to Move',
      });

      // Move to populated target cell
      const movedStory = await authenticatedRequest(app, authToken)
        .post(`/api/stories/${storyToMove.id}/move`)
        .send({ release_id: release2.id })
        .expect(201)
        .then(res => res.body);

      // Verify sort_order calculated as (count + 1) * 1000
      expect(movedStory.sort_order).toBe(4000); // 4th story in cell
    });

    it('should move story to different step (same release)', async () => {
      // Create journey with 2 steps using factories
      const journey = await createJourney(app, authToken, 'Test Journey');
      const step1 = await createStep(app, authToken, journey.id, 'Step 1');
      const step2 = await createStep(app, authToken, journey.id, 'Step 2');

      // Create release using factory
      const release = await createRelease(app, authToken, 'Test Release');

      // Create story in step1 using factory
      const story = await createStory(app, authToken, step1.id, release.id, {
        title: 'Story in Step 1',
      });

      // Move to step2 (same release)
      const movedStory = await authenticatedRequest(app, authToken)
        .post(`/api/stories/${story.id}/move`)
        .send({ step_id: step2.id })
        .expect(201)
        .then(res => res.body);

      // Verify only step changed
      expect(movedStory.step_id).toBe(step2.id);
      expect(movedStory.release_id).toBe(release.id); // Same release
      expect(movedStory.sort_order).toBe(1000); // First in new cell
    });

    it('should move story to different release (same step)', async () => {
      // Create journey and step using factories
      const journey = await createJourney(app, authToken, 'Test Journey');
      const step = await createStep(app, authToken, journey.id, 'Test Step');

      // Create 2 releases using factories
      const release1 = await createRelease(app, authToken, 'Release 1');
      const release2 = await createRelease(app, authToken, 'Release 2');

      // Create story in release1 using factory
      const story = await createStory(app, authToken, step.id, release1.id, {
        title: 'Story in Release 1',
      });

      // Move to release2 (same step)
      const movedStory = await authenticatedRequest(app, authToken)
        .post(`/api/stories/${story.id}/move`)
        .send({ release_id: release2.id })
        .expect(201)
        .then(res => res.body);

      // Verify only release changed
      expect(movedStory.step_id).toBe(step.id); // Same step
      expect(movedStory.release_id).toBe(release2.id);
      expect(movedStory.sort_order).toBe(1000); // First in new cell
    });

    it('should move story to completely different cell (both step and release)', async () => {
      // Create journey with 2 steps using factories
      const journey = await createJourney(app, authToken, 'Test Journey');
      const step1 = await createStep(app, authToken, journey.id, 'Step 1');
      const step2 = await createStep(app, authToken, journey.id, 'Step 2');

      // Create 2 releases using factories
      const release1 = await createRelease(app, authToken, 'Release 1');
      const release2 = await createRelease(app, authToken, 'Release 2');

      // Create 2 stories in source cell (step1, release1) using factories
      const sourceStory1 = await createStory(app, authToken, step1.id, release1.id, {
        title: 'Source Story 1',
      });
      const sourceStory2 = await createStory(app, authToken, step1.id, release1.id, {
        title: 'Source Story 2',
      });

      // Create 1 story in target cell (step2, release2) using factory
      const targetStory = await createStory(app, authToken, step2.id, release2.id, {
        title: 'Target Story 1',
      });

      // Move sourceStory2 to target cell
      const movedStory = await authenticatedRequest(app, authToken)
        .post(`/api/stories/${sourceStory2.id}/move`)
        .send({
          step_id: step2.id,
          release_id: release2.id,
        })
        .expect(201)
        .then(res => res.body);

      // Verify complete move
      expect(movedStory.step_id).toBe(step2.id);
      expect(movedStory.release_id).toBe(release2.id);
      expect(movedStory.sort_order).toBe(2000); // Second in target cell

      // Verify source cell still has 1 story
      const sourceStories = await authenticatedRequest(app, authToken)
        .get('/api/stories')
        .query({ step_id: step1.id, release_id: release1.id })
        .expect(200)
        .then(res => res.body);

      expect(sourceStories).toHaveLength(1);
      expect(sourceStories[0].id).toBe(sourceStory1.id);

      // Verify target cell now has 2 stories
      const targetStories = await authenticatedRequest(app, authToken)
        .get('/api/stories')
        .query({ step_id: step2.id, release_id: release2.id })
        .expect(200)
        .then(res => res.body);

      expect(targetStories).toHaveLength(2);
      const targetIds = targetStories.map((s: any) => s.id);
      expect(targetIds).toContain(targetStory.id);
      expect(targetIds).toContain(movedStory.id);
    });

    it('should maintain 1000-spacing in target cell after move', async () => {
      // Create journey and step using factories
      const journey = await createJourney(app, authToken, 'Test Journey');
      const step = await createStep(app, authToken, journey.id, 'Test Step');

      // Create 2 releases using factories
      const release1 = await createRelease(app, authToken, 'Release 1');
      const release2 = await createRelease(app, authToken, 'Release 2');

      // Create 5 stories in target cell using factories
      const targetStories = [];
      for (let i = 1; i <= 5; i++) {
        const story = await createStory(app, authToken, step.id, release2.id, {
          title: `Target Story ${i}`,
        });
        targetStories.push(story);
      }

      // Verify initial 1000-spacing
      expect(targetStories[0].sort_order).toBe(1000);
      expect(targetStories[1].sort_order).toBe(2000);
      expect(targetStories[2].sort_order).toBe(3000);
      expect(targetStories[3].sort_order).toBe(4000);
      expect(targetStories[4].sort_order).toBe(5000);

      // Create story to move using factory
      const storyToMove = await createStory(app, authToken, step.id, release1.id, {
        title: 'Story to Move',
      });

      // Move to target cell
      const movedStory = await authenticatedRequest(app, authToken)
        .post(`/api/stories/${storyToMove.id}/move`)
        .send({ release_id: release2.id })
        .expect(201)
        .then(res => res.body);

      // Verify 1000-spacing maintained
      expect(movedStory.sort_order).toBe(6000); // 6th story = 6 * 1000

      // Get all stories in target cell to verify spacing
      const allTargetStories = await authenticatedRequest(app, authToken)
        .get('/api/stories')
        .query({ step_id: step.id, release_id: release2.id })
        .expect(200)
        .then(res => res.body);

      expect(allTargetStories).toHaveLength(6);

      // Verify all have proper 1000-spacing
      const sortOrders = allTargetStories.map((s: any) => s.sort_order).sort((a: number, b: number) => a - b);
      expect(sortOrders).toEqual([1000, 2000, 3000, 4000, 5000, 6000]);
    });
  });
});
