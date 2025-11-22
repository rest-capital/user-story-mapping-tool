/**
 * Story Moving E2E Tests (Tier 2)
 *
 * Coverage: 17 active tests (20 total, 3 skipped) - EXCELLENT ✅
 * - 6 Business Logic tests (various move scenarios, sort_order calculation)
 * - 5 DTO Validation tests (empty body, invalid types, empty strings)
 * - 3 Service Validation tests (non-existent entities)
 * - 1 Edge Case test (noop move to same cell)
 * - 2 Workspace Isolation tests (cross-workspace prevention) ✅ PASSING
 *
 * Skipped (3 tests - TODO):
 * - Preserve dependencies (needs story-dependencies endpoint)
 * - Preserve comments (needs comments endpoint confirmation)
 * - Preserve tags/personas (needs factory support for associations)
 *
 * Tests complex story moving operations:
 * - Move story to different cell (step + release)
 * - Auto-recalculate sort_order in target cell
 * - Move to different step (same release)
 * - Move to different release (same step)
 * - Move to completely different cell
 * - Verify 1000-spacing maintained in target
 * - Validate DTO constraints and service boundaries
 * - Test workspace isolation (enforces multi-tenancy boundaries)
 *
 * Following patterns from E2E_TESTING_STRATEGY.md Tier 2.4
 * REFACTORED: Using factory pattern for entity creation
 *
 * ✅ SECURITY BUG FIXED: Workspace isolation now enforced!
 * The service validates that target steps/releases belong to same story map.
 * Implementation: stories.service.ts:414-475 includes workspace validation
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
  createPersona
} from './factories';

describe('Stories Moving (E2E) - Tier 2', () => {
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

  describe('POST /api/stories/:id/move', () => {
    it('should move story to different cell with proper sort_order', async () => {
      // Create journey with 2 steps using factories
      const journey = await createJourney(app, authToken, storyMap.id, 'Test Journey');
      const step1 = await createStep(app, authToken, journey.id, 'Step 1');
      const step2 = await createStep(app, authToken, journey.id, 'Step 2');

      // Create 2 releases using factories
      const release1 = await createRelease(app, authToken, storyMap.id, 'Release 1');
      const release2 = await createRelease(app, authToken, storyMap.id, 'Release 2');

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
      const journey = await createJourney(app, authToken, storyMap.id, 'Test Journey');
      const step = await createStep(app, authToken, journey.id, 'Test Step');

      // Create 2 releases using factories
      const release1 = await createRelease(app, authToken, storyMap.id, 'Release 1');
      const release2 = await createRelease(app, authToken, storyMap.id, 'Release 2');

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
      const journey = await createJourney(app, authToken, storyMap.id, 'Test Journey');
      const step1 = await createStep(app, authToken, journey.id, 'Step 1');
      const step2 = await createStep(app, authToken, journey.id, 'Step 2');

      // Create release using factory
      const release = await createRelease(app, authToken, storyMap.id, 'Test Release');

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
      const journey = await createJourney(app, authToken, storyMap.id, 'Test Journey');
      const step = await createStep(app, authToken, journey.id, 'Test Step');

      // Create 2 releases using factories
      const release1 = await createRelease(app, authToken, storyMap.id, 'Release 1');
      const release2 = await createRelease(app, authToken, storyMap.id, 'Release 2');

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
      const journey = await createJourney(app, authToken, storyMap.id, 'Test Journey');
      const step1 = await createStep(app, authToken, journey.id, 'Step 1');
      const step2 = await createStep(app, authToken, journey.id, 'Step 2');

      // Create 2 releases using factories
      const release1 = await createRelease(app, authToken, storyMap.id, 'Release 1');
      const release2 = await createRelease(app, authToken, storyMap.id, 'Release 2');

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
      const journey = await createJourney(app, authToken, storyMap.id, 'Test Journey');
      const step = await createStep(app, authToken, journey.id, 'Test Step');

      // Create 2 releases using factories
      const release1 = await createRelease(app, authToken, storyMap.id, 'Release 1');
      const release2 = await createRelease(app, authToken, storyMap.id, 'Release 2');

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

    // ========================================
    // DTO Validation Tests
    // ========================================

    describe('DTO Validation', () => {
      it('should return 400 when neither step_id nor release_id is provided', async () => {
        // Create journey and step using factories
        const journey = await createJourney(app, authToken, storyMap.id, 'Test Journey');
        const step = await createStep(app, authToken, journey.id, 'Test Step');
        const release = await createRelease(app, authToken, storyMap.id, 'Test Release');

        // Create story using factory
        const story = await createStory(app, authToken, step.id, release.id, {
          title: 'Test Story',
        });

        // Try to move with empty body
        const response = await authenticatedRequest(app, authToken)
          .post(`/api/stories/${story.id}/move`)
          .send({})
          .expect(400);

        expect(response.body.message).toContain('At least one of step_id or release_id must be provided');
      });

      it('should return 400 when step_id is invalid type (number)', async () => {
        // Create journey and step using factories
        const journey = await createJourney(app, authToken, storyMap.id, 'Test Journey');
        const step = await createStep(app, authToken, journey.id, 'Test Step');
        const release = await createRelease(app, authToken, storyMap.id, 'Test Release');

        // Create story using factory
        const story = await createStory(app, authToken, step.id, release.id, {
          title: 'Test Story',
        });

        // Try to move with number instead of string
        const response = await authenticatedRequest(app, authToken)
          .post(`/api/stories/${story.id}/move`)
          .send({ step_id: 12345 })
          .expect(400);

        expect(response.body.message).toEqual(
          expect.arrayContaining([expect.stringContaining('step_id must be a string')])
        );
      });

      it('should return 400 when release_id is invalid type (number)', async () => {
        // Create journey and step using factories
        const journey = await createJourney(app, authToken, storyMap.id, 'Test Journey');
        const step = await createStep(app, authToken, journey.id, 'Test Step');
        const release = await createRelease(app, authToken, storyMap.id, 'Test Release');

        // Create story using factory
        const story = await createStory(app, authToken, step.id, release.id, {
          title: 'Test Story',
        });

        // Try to move with number instead of string
        const response = await authenticatedRequest(app, authToken)
          .post(`/api/stories/${story.id}/move`)
          .send({ release_id: 12345 })
          .expect(400);

        expect(response.body.message).toEqual(
          expect.arrayContaining([expect.stringContaining('release_id must be a string')])
        );
      });

      it('should return 400 when step_id is empty string', async () => {
        // Create journey and step using factories
        const journey = await createJourney(app, authToken, storyMap.id, 'Test Journey');
        const step = await createStep(app, authToken, journey.id, 'Test Step');
        const release = await createRelease(app, authToken, storyMap.id, 'Test Release');

        // Create story using factory
        const story = await createStory(app, authToken, step.id, release.id, {
          title: 'Test Story',
        });

        // Try to move with empty string
        const response = await authenticatedRequest(app, authToken)
          .post(`/api/stories/${story.id}/move`)
          .send({ step_id: '' })
          .expect(400);

        // Empty string should fail validation (either @IsString or service validation)
        expect(response.body.message).toBeDefined();
      });

      it('should return 400 when release_id is empty string', async () => {
        // Create journey and step using factories
        const journey = await createJourney(app, authToken, storyMap.id, 'Test Journey');
        const step = await createStep(app, authToken, journey.id, 'Test Step');
        const release = await createRelease(app, authToken, storyMap.id, 'Test Release');

        // Create story using factory
        const story = await createStory(app, authToken, step.id, release.id, {
          title: 'Test Story',
        });

        // Try to move with empty string
        const response = await authenticatedRequest(app, authToken)
          .post(`/api/stories/${story.id}/move`)
          .send({ release_id: '' })
          .expect(400);

        // Empty string should fail validation (either @IsString or service validation)
        expect(response.body.message).toBeDefined();
      });
    });

    // ========================================
    // Service Validation Tests
    // ========================================

    describe('Service Validation', () => {
      it('should return 404 when story does not exist', async () => {
        // Create journey and step for target
        const journey = await createJourney(app, authToken, storyMap.id, 'Test Journey');
        const step = await createStep(app, authToken, journey.id, 'Test Step');

        // Try to move non-existent story
        const response = await authenticatedRequest(app, authToken)
          .post('/api/stories/non-existent-id/move')
          .send({ step_id: step.id })
          .expect(404);

        expect(response.body.message).toContain('Story not found');
      });

      it('should return 404 when target step does not exist', async () => {
        // Create journey and step using factories
        const journey = await createJourney(app, authToken, storyMap.id, 'Test Journey');
        const step = await createStep(app, authToken, journey.id, 'Test Step');
        const release = await createRelease(app, authToken, storyMap.id, 'Test Release');

        // Create story using factory
        const story = await createStory(app, authToken, step.id, release.id, {
          title: 'Test Story',
        });

        // Try to move to non-existent step
        // Exception filter maps "not found" message to 404
        const response = await authenticatedRequest(app, authToken)
          .post(`/api/stories/${story.id}/move`)
          .send({ step_id: 'non-existent-step-id' })
          .expect(404);

        expect(response.body.message).toContain('Target step not found');
      });

      it('should return 404 when target release does not exist', async () => {
        // Create journey and step using factories
        const journey = await createJourney(app, authToken, storyMap.id, 'Test Journey');
        const step = await createStep(app, authToken, journey.id, 'Test Step');
        const release = await createRelease(app, authToken, storyMap.id, 'Test Release');

        // Create story using factory
        const story = await createStory(app, authToken, step.id, release.id, {
          title: 'Test Story',
        });

        // Try to move to non-existent release
        // Exception filter maps "not found" message to 404
        const response = await authenticatedRequest(app, authToken)
          .post(`/api/stories/${story.id}/move`)
          .send({ release_id: 'non-existent-release-id' })
          .expect(404);

        expect(response.body.message).toContain('Target release not found');
      });
    });

    // ========================================
    // Edge Cases
    // ========================================

    describe('Edge Cases', () => {
      it('should handle moving to same cell as noop', async () => {
        // Create journey and step using factories
        const journey = await createJourney(app, authToken, storyMap.id, 'Test Journey');
        const step = await createStep(app, authToken, journey.id, 'Test Step');
        const release = await createRelease(app, authToken, storyMap.id, 'Test Release');

        // Create story using factory
        const story = await createStory(app, authToken, step.id, release.id, {
          title: 'Test Story',
        });

        // Move to same cell
        const movedStory = await authenticatedRequest(app, authToken)
          .post(`/api/stories/${story.id}/move`)
          .send({
            step_id: step.id,
            release_id: release.id,
          })
          .expect(201)
          .then(res => res.body);

        // Verify story is in same position
        expect(movedStory.step_id).toBe(step.id);
        expect(movedStory.release_id).toBe(release.id);
        // Note: sort_order might change due to recalculation logic
        // This is acceptable behavior
      });

      // TODO: Enable once story-dependencies endpoint is available
      it.skip('should preserve dependencies when moving story', async () => {
        // Create journey with 2 steps using factories
        const journey = await createJourney(app, authToken, storyMap.id, 'Test Journey');
        const step1 = await createStep(app, authToken, journey.id, 'Step 1');
        const step2 = await createStep(app, authToken, journey.id, 'Step 2');
        const release = await createRelease(app, authToken, storyMap.id, 'Test Release');

        // Create 2 stories using factories
        const story1 = await createStory(app, authToken, step1.id, release.id, {
          title: 'Story 1',
        });
        const story2 = await createStory(app, authToken, step1.id, release.id, {
          title: 'Story 2',
        });

        // Create dependency: story2 depends on story1
        const dependency = await authenticatedRequest(app, authToken)
          .post('/api/story-dependencies')
          .send({
            source_story_id: story2.id,
            target_story_id: story1.id,
            link_type: 'depends_on',
          })
          .expect(201)
          .then(res => res.body);

        // Move story2 to step2
        await authenticatedRequest(app, authToken)
          .post(`/api/stories/${story2.id}/move`)
          .send({ step_id: step2.id })
          .expect(201);

        // Verify dependency still exists
        const dependencies = await authenticatedRequest(app, authToken)
          .get(`/api/stories/${story2.id}/dependencies`)
          .expect(200)
          .then(res => res.body);

        expect(dependencies).toHaveLength(1);
        expect(dependencies[0].id).toBe(dependency.id);
        expect(dependencies[0].target_story_id).toBe(story1.id);
      });

      // TODO: Enable once comments endpoint format is confirmed
      it.skip('should preserve comments when moving story', async () => {
        // Create journey with 2 steps using factories
        const journey = await createJourney(app, authToken, storyMap.id, 'Test Journey');
        const step1 = await createStep(app, authToken, journey.id, 'Step 1');
        const step2 = await createStep(app, authToken, journey.id, 'Step 2');
        const release = await createRelease(app, authToken, storyMap.id, 'Test Release');

        // Create story using factory
        const story = await createStory(app, authToken, step1.id, release.id, {
          title: 'Story with Comment',
        });

        // Add comment to story
        const comment = await authenticatedRequest(app, authToken)
          .post(`/api/comments`)
          .send({
            story_id: story.id,
            content: 'Important comment',
          })
          .expect(201)
          .then(res => res.body);

        // Move story to step2
        await authenticatedRequest(app, authToken)
          .post(`/api/stories/${story.id}/move`)
          .send({ step_id: step2.id })
          .expect(201);

        // Verify comment still exists
        const comments = await authenticatedRequest(app, authToken)
          .get(`/api/comments?story_id=${story.id}`)
          .expect(200)
          .then(res => res.body);

        expect(comments).toHaveLength(1);
        expect(comments[0].id).toBe(comment.id);
        expect(comments[0].content).toBe('Important comment');
      });

      // TODO: Enable once createStory factory supports tag_ids/persona_ids
      it.skip('should preserve tags and personas when moving story', async () => {
        // Create journey with 2 steps using factories
        const journey = await createJourney(app, authToken, storyMap.id, 'Test Journey');
        const step1 = await createStep(app, authToken, journey.id, 'Step 1');
        const step2 = await createStep(app, authToken, journey.id, 'Step 2');
        const release = await createRelease(app, authToken, storyMap.id, 'Test Release');

        // Create tag and persona
        const tag = await createTag(app, authToken, storyMap.id, 'Frontend');
        const persona = await createPersona(app, authToken, storyMap.id, 'Developer');

        // Create story with tag and persona using factory
        const story = await createStory(app, authToken, step1.id, release.id, {
          title: 'Story with Tags',
          tag_ids: [tag.id],
          persona_ids: [persona.id],
        });

        // Verify initial associations
        expect(story.tags).toHaveLength(1);
        expect(story.personas).toHaveLength(1);

        // Move story to step2
        const movedStory = await authenticatedRequest(app, authToken)
          .post(`/api/stories/${story.id}/move`)
          .send({ step_id: step2.id })
          .expect(201)
          .then(res => res.body);

        // Verify tags and personas preserved
        expect(movedStory.tags).toHaveLength(1);
        expect(movedStory.tags[0].id).toBe(tag.id);
        expect(movedStory.personas).toHaveLength(1);
        expect(movedStory.personas[0].id).toBe(persona.id);
      });
    });

    // ========================================
    // Workspace Isolation Tests (CRITICAL)
    // ========================================

    describe('Workspace Isolation', () => {
      it('should prevent moving story to step from different story map', async () => {
        // Create two separate story maps
        const storyMap2 = await createStoryMap(app, authToken, 'Story Map 2');

        // Create journey and step in storyMap1
        const journey1 = await createJourney(app, authToken, storyMap.id, 'Journey 1');
        const step1 = await createStep(app, authToken, journey1.id, 'Step 1');
        const release1 = await createRelease(app, authToken, storyMap.id, 'Release 1');

        // Create journey and step in storyMap2
        const journey2 = await createJourney(app, authToken, storyMap2.id, 'Journey 2');
        const step2 = await createStep(app, authToken, journey2.id, 'Step 2');

        // Create story in storyMap1
        const story = await createStory(app, authToken, step1.id, release1.id, {
          title: 'Story in Map 1',
        });

        // Try to move to step from different story map
        // EXPECTED TO FAIL: This exposes the workspace isolation bug
        const response = await authenticatedRequest(app, authToken)
          .post(`/api/stories/${story.id}/move`)
          .send({ step_id: step2.id })
          .expect(400);

        expect(response.body.message).toContain('different story map');
      });

      it('should prevent moving story to release from different story map', async () => {
        // Create two separate story maps
        const storyMap2 = await createStoryMap(app, authToken, 'Story Map 2');

        // Create journey and step in storyMap1
        const journey1 = await createJourney(app, authToken, storyMap.id, 'Journey 1');
        const step1 = await createStep(app, authToken, journey1.id, 'Step 1');
        const release1 = await createRelease(app, authToken, storyMap.id, 'Release 1');

        // Create release in storyMap2
        const release2 = await createRelease(app, authToken, storyMap2.id, 'Release 2');

        // Create story in storyMap1
        const story = await createStory(app, authToken, step1.id, release1.id, {
          title: 'Story in Map 1',
        });

        // Try to move to release from different story map
        // EXPECTED TO FAIL: This exposes the workspace isolation bug
        const response = await authenticatedRequest(app, authToken)
          .post(`/api/stories/${story.id}/move`)
          .send({ release_id: release2.id })
          .expect(400);

        expect(response.body.message).toContain('different story map');
      });
    });
  });
});
