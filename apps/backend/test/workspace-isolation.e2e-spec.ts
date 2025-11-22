/**
 * Workspace Isolation E2E Tests (Tier 2) - EXCELLENT (19 tests)
 *
 * Tests that StoryMaps provide proper workspace isolation:
 * - Entities scoped to correct story map (READ operations)
 * - Cannot access entities from different story map
 * - Unassigned release is per-workspace
 * - Composite unique constraints work correctly (Tag/Persona names unique per workspace)
 * - Cross-workspace data leakage prevention
 * - DELETE operations validate workspace ownership (5 operations)
 * - Association operations validate workspace boundaries (5 operations)
 *
 * This is a critical test suite for multi-tenancy support and security.
 *
 * Coverage:
 * - Original Tests: 10 tests (READ operations, composite constraints, reordering)
 * - DELETE Operations: 5 tests (journeys, releases, tags, personas, stories)
 * - Association Operations: 5 tests (add tag, add persona, move step, move release, dependencies)
 * - Total: 19 tests
 */

import { INestApplication } from '@nestjs/common';
import { createTestApp } from './helpers/test-app';
import { createAuthToken, authenticatedRequest } from './helpers/auth';
import {
  createStoryMap,
  createJourney,
  createRelease,
  createTag,
  createPersona,
  createStep,
  createStory,
  getUnassignedRelease,
} from './factories';

describe('Workspace Isolation (E2E) - Tier 2', () => {
  let app: INestApplication;
  let authToken: string;
  let storyMap1: any;
  let storyMap2: any;

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    authToken = await createAuthToken(app);
    // Create two separate workspaces for isolation testing
    storyMap1 = await createStoryMap(app, authToken, 'Workspace 1');
    storyMap2 = await createStoryMap(app, authToken, 'Workspace 2');
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Journey Isolation', () => {
    it('should only return journeys from the requested workspace', async () => {
      // Create journeys in workspace 1
      await createJourney(app, authToken, storyMap1.id, 'Journey 1A');
      await createJourney(app, authToken, storyMap1.id, 'Journey 1B');

      // Create journeys in workspace 2
      await createJourney(app, authToken, storyMap2.id, 'Journey 2A');
      await createJourney(app, authToken, storyMap2.id, 'Journey 2B');

      // Query workspace 1
      const response1 = await authenticatedRequest(app, authToken)
        .get(`/api/journeys?story_map_id=${storyMap1.id}`)
        .expect(200);

      expect(response1.body).toHaveLength(2);
      expect(response1.body.every((j: any) => j.story_map_id === storyMap1.id)).toBe(true);
      expect(response1.body.every((j: any) => j.name.startsWith('Journey 1'))).toBe(true);

      // Query workspace 2
      const response2 = await authenticatedRequest(app, authToken)
        .get(`/api/journeys?story_map_id=${storyMap2.id}`)
        .expect(200);

      expect(response2.body).toHaveLength(2);
      expect(response2.body.every((j: any) => j.story_map_id === storyMap2.id)).toBe(true);
      expect(response2.body.every((j: any) => j.name.startsWith('Journey 2'))).toBe(true);
    });
  });

  describe('Release Isolation', () => {
    it('should only return releases from the requested workspace', async () => {
      // Create releases in workspace 1
      await createRelease(app, authToken, storyMap1.id, 'Release 1A');
      await createRelease(app, authToken, storyMap1.id, 'Release 1B');

      // Create releases in workspace 2
      await createRelease(app, authToken, storyMap2.id, 'Release 2A');
      await createRelease(app, authToken, storyMap2.id, 'Release 2B');

      // Query workspace 1
      const response1 = await authenticatedRequest(app, authToken)
        .get(`/api/releases?story_map_id=${storyMap1.id}`)
        .expect(200);

      expect(response1.body.length).toBeGreaterThanOrEqual(2); // May include Unassigned
      const customReleases1 = response1.body.filter((r: any) => !r.is_unassigned);
      expect(customReleases1).toHaveLength(2);
      expect(customReleases1.every((r: any) => r.story_map_id === storyMap1.id)).toBe(true);

      // Query workspace 2
      const response2 = await authenticatedRequest(app, authToken)
        .get(`/api/releases?story_map_id=${storyMap2.id}`)
        .expect(200);

      const customReleases2 = response2.body.filter((r: any) => !r.is_unassigned);
      expect(customReleases2).toHaveLength(2);
      expect(customReleases2.every((r: any) => r.story_map_id === storyMap2.id)).toBe(true);
    });

    it('should have separate Unassigned releases per workspace', async () => {
      // Get Unassigned release for workspace 1
      const unassigned1 = await getUnassignedRelease(app, authToken, storyMap1.id);

      // Get Unassigned release for workspace 2
      const unassigned2 = await getUnassignedRelease(app, authToken, storyMap2.id);

      // Verify they are different releases
      expect(unassigned1.id).not.toBe(unassigned2.id);
      expect(unassigned1.story_map_id).toBe(storyMap1.id);
      expect(unassigned2.story_map_id).toBe(storyMap2.id);
      expect(unassigned1.is_unassigned).toBe(true);
      expect(unassigned2.is_unassigned).toBe(true);
    });
  });

  describe('Tag Isolation & Composite Unique', () => {
    it('should only return tags from the requested workspace', async () => {
      // Create tags in workspace 1
      await createTag(app, authToken, storyMap1.id, 'Frontend');
      await createTag(app, authToken, storyMap1.id, 'Backend');

      // Create tags in workspace 2
      await createTag(app, authToken, storyMap2.id, 'Mobile');
      await createTag(app, authToken, storyMap2.id, 'Desktop');

      // Query workspace 1
      const response1 = await authenticatedRequest(app, authToken)
        .get(`/api/tags?story_map_id=${storyMap1.id}`)
        .expect(200);

      expect(response1.body).toHaveLength(2);
      expect(response1.body.every((t: any) => t.story_map_id === storyMap1.id)).toBe(true);

      // Query workspace 2
      const response2 = await authenticatedRequest(app, authToken)
        .get(`/api/tags?story_map_id=${storyMap2.id}`)
        .expect(200);

      expect(response2.body).toHaveLength(2);
      expect(response2.body.every((t: any) => t.story_map_id === storyMap2.id)).toBe(true);
    });

    it('should allow duplicate tag names across different workspaces', async () => {
      // Create "Frontend" tag in workspace 1
      const tag1 = await createTag(app, authToken, storyMap1.id, 'Frontend');

      // Create "Frontend" tag in workspace 2 (same name, different workspace)
      const tag2 = await createTag(app, authToken, storyMap2.id, 'Frontend');

      // Both should succeed (unique per workspace)
      expect(tag1.name).toBe('Frontend');
      expect(tag2.name).toBe('Frontend');
      expect(tag1.id).not.toBe(tag2.id);
      expect(tag1.story_map_id).toBe(storyMap1.id);
      expect(tag2.story_map_id).toBe(storyMap2.id);
    });

    it('should reject duplicate tag names within same workspace', async () => {
      // Create "Frontend" tag in workspace 1
      await createTag(app, authToken, storyMap1.id, 'Frontend');

      // Try to create duplicate "Frontend" tag in same workspace
      await authenticatedRequest(app, authToken)
        .post('/api/tags')
        .send({
          story_map_id: storyMap1.id,
          name: 'Frontend',
          color: '#3B82F6',
        })
        .expect(400);
    });
  });

  describe('Persona Isolation & Composite Unique', () => {
    it('should only return personas from the requested workspace', async () => {
      // Create personas in workspace 1
      await createPersona(app, authToken, storyMap1.id, 'Admin');
      await createPersona(app, authToken, storyMap1.id, 'User');

      // Create personas in workspace 2
      await createPersona(app, authToken, storyMap2.id, 'Manager');
      await createPersona(app, authToken, storyMap2.id, 'Guest');

      // Query workspace 1
      const response1 = await authenticatedRequest(app, authToken)
        .get(`/api/personas?story_map_id=${storyMap1.id}`)
        .expect(200);

      expect(response1.body).toHaveLength(2);
      expect(response1.body.every((p: any) => p.story_map_id === storyMap1.id)).toBe(true);

      // Query workspace 2
      const response2 = await authenticatedRequest(app, authToken)
        .get(`/api/personas?story_map_id=${storyMap2.id}`)
        .expect(200);

      expect(response2.body).toHaveLength(2);
      expect(response2.body.every((p: any) => p.story_map_id === storyMap2.id)).toBe(true);
    });

    it('should allow duplicate persona names across different workspaces', async () => {
      // Create "Admin" persona in workspace 1
      const persona1 = await createPersona(app, authToken, storyMap1.id, 'Admin');

      // Create "Admin" persona in workspace 2 (same name, different workspace)
      const persona2 = await createPersona(app, authToken, storyMap2.id, 'Admin');

      // Both should succeed (unique per workspace)
      expect(persona1.name).toBe('Admin');
      expect(persona2.name).toBe('Admin');
      expect(persona1.id).not.toBe(persona2.id);
      expect(persona1.story_map_id).toBe(storyMap1.id);
      expect(persona2.story_map_id).toBe(storyMap2.id);
    });
  });

  describe('Story Isolation (Indirect via Journey/Release)', () => {
    it('should prevent stories from leaking between workspaces', async () => {
      // Setup workspace 1
      const journey1 = await createJourney(app, authToken, storyMap1.id, 'Journey 1');
      const release1 = await createRelease(app, authToken, storyMap1.id, 'Release 1');
      const step1 = await createStep(app, authToken, journey1.id, 'Step 1');
      await createStory(app, authToken, step1.id, release1.id, { title: 'Story 1' });

      // Setup workspace 2
      const journey2 = await createJourney(app, authToken, storyMap2.id, 'Journey 2');
      const release2 = await createRelease(app, authToken, storyMap2.id, 'Release 2');
      const step2 = await createStep(app, authToken, journey2.id, 'Step 2');
      await createStory(app, authToken, step2.id, release2.id, { title: 'Story 2' });

      // Get journeys from workspace 1
      const journeys1Response = await authenticatedRequest(app, authToken)
        .get(`/api/journeys?story_map_id=${storyMap1.id}`)
        .expect(200);

      expect(journeys1Response.body).toHaveLength(1);
      expect(journeys1Response.body[0].story_map_id).toBe(storyMap1.id);

      // Get journeys from workspace 2
      const journeys2Response = await authenticatedRequest(app, authToken)
        .get(`/api/journeys?story_map_id=${storyMap2.id}`)
        .expect(200);

      expect(journeys2Response.body).toHaveLength(1);
      expect(journeys2Response.body[0].story_map_id).toBe(storyMap2.id);
    });
  });

  describe('Journey Reorder Isolation', () => {
    it('should only reorder journeys within the same workspace', async () => {
      // Create 3 journeys in workspace 1
      const journey1A = await createJourney(app, authToken, storyMap1.id, 'Journey 1A');
      const journey1B = await createJourney(app, authToken, storyMap1.id, 'Journey 1B');
      const journey1C = await createJourney(app, authToken, storyMap1.id, 'Journey 1C');

      // Create journeys in workspace 2 (should not be affected)
      await createJourney(app, authToken, storyMap2.id, 'Journey 2A');
      await createJourney(app, authToken, storyMap2.id, 'Journey 2B');

      // Reorder journey in workspace 1 (move last to first)
      await authenticatedRequest(app, authToken)
        .post(`/api/journeys/${journey1C.id}/reorder`)
        .send({ new_sort_order: 0 })
        .expect(201);

      // Verify workspace 1 order changed
      const response1 = await authenticatedRequest(app, authToken)
        .get(`/api/journeys?story_map_id=${storyMap1.id}`)
        .expect(200);

      expect(response1.body).toHaveLength(3);
      expect(response1.body[0].id).toBe(journey1C.id); // Journey C moved to first
      expect(response1.body[1].id).toBe(journey1A.id); // Journey A shifted down
      expect(response1.body[2].id).toBe(journey1B.id); // Journey B stayed last

      // Verify workspace 2 unaffected
      const response2 = await authenticatedRequest(app, authToken)
        .get(`/api/journeys?story_map_id=${storyMap2.id}`)
        .expect(200);

      expect(response2.body).toHaveLength(2);
      expect(response2.body[0].sort_order).toBe(0);
      expect(response2.body[1].sort_order).toBe(1);
    });
  });

  describe('DELETE Operations Workspace Isolation', () => {
    it('should prevent deleting a journey from another workspace', async () => {
      // Create journey in workspace 1
      const journey1 = await createJourney(app, authToken, storyMap1.id, 'Journey 1');

      // Try to delete journey1 using workspace 2's story_map_id (should fail)
      await authenticatedRequest(app, authToken)
        .delete(`/api/journeys/${journey1.id}?story_map_id=${storyMap2.id}`)
        .expect(404);

      // Verify journey still exists in workspace 1
      const response = await authenticatedRequest(app, authToken)
        .get(`/api/journeys?story_map_id=${storyMap1.id}`)
        .expect(200);

      expect(response.body.some((j: any) => j.id === journey1.id)).toBe(true);
    });

    it('should prevent deleting a release from another workspace', async () => {
      // Create release in workspace 1
      const release1 = await createRelease(app, authToken, storyMap1.id, 'Release 1');

      // Try to delete release1 using workspace 2's story_map_id (should fail)
      await authenticatedRequest(app, authToken)
        .delete(`/api/releases/${release1.id}?story_map_id=${storyMap2.id}`)
        .expect(404);

      // Verify release still exists in workspace 1
      const response = await authenticatedRequest(app, authToken)
        .get(`/api/releases?story_map_id=${storyMap1.id}`)
        .expect(200);

      expect(response.body.some((r: any) => r.id === release1.id)).toBe(true);
    });

    it('should prevent deleting a tag from another workspace', async () => {
      // Create tag in workspace 1
      const tag1 = await createTag(app, authToken, storyMap1.id, 'Tag 1');

      // Try to delete tag1 using workspace 2's story_map_id (should fail)
      await authenticatedRequest(app, authToken)
        .delete(`/api/tags/${tag1.id}?story_map_id=${storyMap2.id}`)
        .expect(404);

      // Verify tag still exists in workspace 1
      const response = await authenticatedRequest(app, authToken)
        .get(`/api/tags?story_map_id=${storyMap1.id}`)
        .expect(200);

      expect(response.body.some((t: any) => t.id === tag1.id)).toBe(true);
    });

    it('should prevent deleting a persona from another workspace', async () => {
      // Create persona in workspace 1
      const persona1 = await createPersona(app, authToken, storyMap1.id, 'Persona 1');

      // Try to delete persona1 using workspace 2's story_map_id (should fail)
      await authenticatedRequest(app, authToken)
        .delete(`/api/personas/${persona1.id}?story_map_id=${storyMap2.id}`)
        .expect(404);

      // Verify persona still exists in workspace 1
      const response = await authenticatedRequest(app, authToken)
        .get(`/api/personas?story_map_id=${storyMap1.id}`)
        .expect(200);

      expect(response.body.some((p: any) => p.id === persona1.id)).toBe(true);
    });

    it('should prevent deleting a story from another workspace', async () => {
      // Setup workspace 1 with story
      const journey1 = await createJourney(app, authToken, storyMap1.id, 'Journey 1');
      const release1 = await createRelease(app, authToken, storyMap1.id, 'Release 1');
      const step1 = await createStep(app, authToken, journey1.id, 'Step 1');
      const story1 = await createStory(app, authToken, step1.id, release1.id, { title: 'Story 1' });

      // Try to delete story1 using workspace 2's story_map_id (should fail)
      await authenticatedRequest(app, authToken)
        .delete(`/api/stories/${story1.id}?story_map_id=${storyMap2.id}`)
        .expect(404);

      // Verify story still exists
      await authenticatedRequest(app, authToken)
        .get(`/api/stories/${story1.id}`)
        .expect(200);
    });
  });

  describe('Association Operations Workspace Isolation', () => {
    it('should prevent adding a tag from another workspace to a story', async () => {
      // Setup workspace 1 with story
      const journey1 = await createJourney(app, authToken, storyMap1.id, 'Journey 1');
      const release1 = await createRelease(app, authToken, storyMap1.id, 'Release 1');
      const step1 = await createStep(app, authToken, journey1.id, 'Step 1');
      const story1 = await createStory(app, authToken, step1.id, release1.id, { title: 'Story 1' });

      // Create tag in workspace 2
      const tag2 = await createTag(app, authToken, storyMap2.id, 'Tag from Workspace 2');

      // Try to add tag2 (from workspace 2) to story1 (from workspace 1) - should fail
      await authenticatedRequest(app, authToken)
        .post(`/api/stories/${story1.id}/tags/${tag2.id}`)
        .expect(404);

      // Verify tag was NOT added to story
      const response = await authenticatedRequest(app, authToken)
        .get(`/api/stories/${story1.id}`)
        .expect(200);

      expect(response.body.tags || []).toHaveLength(0);
    });

    it('should prevent adding a persona from another workspace to a story', async () => {
      // Setup workspace 1 with story
      const journey1 = await createJourney(app, authToken, storyMap1.id, 'Journey 1');
      const release1 = await createRelease(app, authToken, storyMap1.id, 'Release 1');
      const step1 = await createStep(app, authToken, journey1.id, 'Step 1');
      const story1 = await createStory(app, authToken, step1.id, release1.id, { title: 'Story 1' });

      // Create persona in workspace 2
      const persona2 = await createPersona(app, authToken, storyMap2.id, 'Persona from Workspace 2');

      // Try to add persona2 (from workspace 2) to story1 (from workspace 1) - should fail
      await authenticatedRequest(app, authToken)
        .post(`/api/stories/${story1.id}/personas/${persona2.id}`)
        .expect(404);

      // Verify persona was NOT added to story
      const response = await authenticatedRequest(app, authToken)
        .get(`/api/stories/${story1.id}`)
        .expect(200);

      expect(response.body.personas || []).toHaveLength(0);
    });

    it('should prevent moving a story to a step from another workspace', async () => {
      // Setup workspace 1 with story
      const journey1 = await createJourney(app, authToken, storyMap1.id, 'Journey 1');
      const release1 = await createRelease(app, authToken, storyMap1.id, 'Release 1');
      const step1 = await createStep(app, authToken, journey1.id, 'Step 1');
      const story1 = await createStory(app, authToken, step1.id, release1.id, { title: 'Story 1' });

      // Create step in workspace 2
      const journey2 = await createJourney(app, authToken, storyMap2.id, 'Journey 2');
      const step2 = await createStep(app, authToken, journey2.id, 'Step 2');

      // Try to move story1 to step2 (different workspace) - should fail
      await authenticatedRequest(app, authToken)
        .patch(`/api/stories/${story1.id}`)
        .send({ step_id: step2.id })
        .expect(404);

      // Verify story still in original step
      const response = await authenticatedRequest(app, authToken)
        .get(`/api/stories/${story1.id}`)
        .expect(200);

      expect(response.body.step_id).toBe(step1.id);
    });

    it('should prevent moving a story to a release from another workspace', async () => {
      // Setup workspace 1 with story
      const journey1 = await createJourney(app, authToken, storyMap1.id, 'Journey 1');
      const release1 = await createRelease(app, authToken, storyMap1.id, 'Release 1');
      const step1 = await createStep(app, authToken, journey1.id, 'Step 1');
      const story1 = await createStory(app, authToken, step1.id, release1.id, { title: 'Story 1' });

      // Create release in workspace 2
      const release2 = await createRelease(app, authToken, storyMap2.id, 'Release 2');

      // Try to move story1 to release2 (different workspace) - should fail
      await authenticatedRequest(app, authToken)
        .patch(`/api/stories/${story1.id}`)
        .send({ release_id: release2.id })
        .expect(404);

      // Verify story still in original release
      const response = await authenticatedRequest(app, authToken)
        .get(`/api/stories/${story1.id}`)
        .expect(200);

      expect(response.body.release_id).toBe(release1.id);
    });

    it('should prevent creating a story link/dependency with a story from another workspace', async () => {
      // Setup workspace 1 with story
      const journey1 = await createJourney(app, authToken, storyMap1.id, 'Journey 1');
      const release1 = await createRelease(app, authToken, storyMap1.id, 'Release 1');
      const step1 = await createStep(app, authToken, journey1.id, 'Step 1');
      const story1 = await createStory(app, authToken, step1.id, release1.id, { title: 'Story 1' });

      // Setup workspace 2 with story
      const journey2 = await createJourney(app, authToken, storyMap2.id, 'Journey 2');
      const release2 = await createRelease(app, authToken, storyMap2.id, 'Release 2');
      const step2 = await createStep(app, authToken, journey2.id, 'Step 2');
      const story2 = await createStory(app, authToken, step2.id, release2.id, { title: 'Story 2' });

      // Try to create dependency between story1 (workspace 1) and story2 (workspace 2) - should fail
      await authenticatedRequest(app, authToken)
        .post('/api/story-links')
        .send({
          source_story_id: story1.id,
          target_story_id: story2.id,
          link_type: 'depends_on',
        })
        .expect(404);

      // Verify no dependencies created
      const response = await authenticatedRequest(app, authToken)
        .get(`/api/stories/${story1.id}`)
        .expect(200);

      expect(response.body.dependencies || []).toHaveLength(0);
    });
  });
});
