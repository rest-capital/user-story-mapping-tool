/**
 * Stories E2E Tests (Tier 1)
 *
 * Tests basic CRUD operations for Stories:
 * - Create story with auth and validation
 * - List all stories (filtered by cell)
 * - Get single story
 * - Update story
 * - Delete story
 * - Error handling (401, 404, 400)
 *
 * Stories are the most complex entity - they require:
 * - step_id (parent: Journey > Step)
 * - release_id (parent: Release)
 * - Positioned in a "cell" (step + release)
 *
 * Following patterns from journeys.e2e-spec.ts and E2E_TESTING_STRATEGY.md
 * REFACTORED: Using factory pattern for parent entity creation
 */

import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './helpers/test-app';
import { createAuthToken, authenticatedRequest } from './helpers/auth';
import { storyFixtures } from './fixtures/story.fixture';
import { createStoryMap, createJourney, createStep, createRelease } from './factories';

describe('Stories (E2E) - Tier 1', () => {
  let app: INestApplication;
  let authToken: string;
  let storyMap: any;

  // Parent entities required for stories
  let stepId: string;
  let releaseId: string;

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    // Auth token is created fresh for each test
    // Database cleanup happens in global setup.ts
    authToken = await createAuthToken(app);
    storyMap = await createStoryMap(app, authToken);

    // Create parent entities required for stories using factories
    // Stories require: step_id (Journey > Step) + release_id
    const journey = await createJourney(app, authToken, storyMap.id);
    const step = await createStep(app, authToken, journey.id, 'Test Step');
    const release = await createRelease(app, authToken, storyMap.id);

    stepId = step.id;
    releaseId = release.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/stories', () => {
    it('should create a story with valid data', async () => {
      const storyData = storyFixtures.minimal(stepId, releaseId);

      const response = await authenticatedRequest(app, authToken)
        .post('/api/stories')
        .send(storyData)
        .expect(201);

      // Verify response structure
      expect(response.body).toMatchObject({
        id: expect.any(String),
        title: storyData.title,
        description: expect.any(String),
        step_id: stepId,
        release_id: releaseId,
        status: 'NOT_READY', // Default
        sort_order: expect.any(Number),
        created_at: expect.any(String),
        updated_at: expect.any(String),
      });

      // Verify sort_order is set
      expect(response.body.sort_order).toBeGreaterThanOrEqual(0);
    });

    it('should reject unauthenticated requests', async () => {
      const storyData = storyFixtures.minimal(stepId, releaseId);

      await request(app.getHttpServer())
        .post('/api/stories')
        .send(storyData)
        .expect(401);
    });

    it('should reject invalid data (empty title)', async () => {
      const invalidData = storyFixtures.invalidEmpty(stepId, releaseId);

      const response = await authenticatedRequest(app, authToken)
        .post('/api/stories')
        .send(invalidData)
        .expect(400);

      // Verify error message
      expect(response.body).toHaveProperty('message');
    });

    it('should reject invalid step_id (foreign key constraint)', async () => {
      const invalidData = storyFixtures.invalidStepId(releaseId);

      const response = await authenticatedRequest(app, authToken)
        .post('/api/stories')
        .send(invalidData)
        .expect(404);

      // Verify error message indicates FK issue
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toMatch(/step|not found|related/i);
    });

    it('should reject invalid release_id (foreign key constraint)', async () => {
      const invalidData = storyFixtures.invalidReleaseId(stepId);

      const response = await authenticatedRequest(app, authToken)
        .post('/api/stories')
        .send(invalidData)
        .expect(404);

      // Verify error message indicates FK issue
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toMatch(/release|not found|related/i);
    });

    it('should auto-calculate sort_order correctly (1000-based spacing)', async () => {
      // Stories use 1000-based spacing: 1000, 2000, 3000...
      // This allows inserting stories between existing ones later

      // Create 3 stories in the same cell
      const story1 = await authenticatedRequest(app, authToken)
        .post('/api/stories')
        .send(storyFixtures.minimal(stepId, releaseId))
        .expect(201);

      const story2 = await authenticatedRequest(app, authToken)
        .post('/api/stories')
        .send(storyFixtures.minimal(stepId, releaseId))
        .expect(201);

      const story3 = await authenticatedRequest(app, authToken)
        .post('/api/stories')
        .send(storyFixtures.minimal(stepId, releaseId))
        .expect(201);

      // Verify 1000-based spacing
      expect(story1.body.sort_order).toBe(1000);
      expect(story2.body.sort_order).toBe(2000);
      expect(story3.body.sort_order).toBe(3000);
    });

    it('should allow duplicate titles (no unique constraint)', async () => {
      const duplicateTitle = 'Duplicate Story Title';

      // Create first story with title
      await authenticatedRequest(app, authToken)
        .post('/api/stories')
        .send(storyFixtures.withTitle(stepId, releaseId, duplicateTitle))
        .expect(201);

      // Create second story with same title - should succeed
      await authenticatedRequest(app, authToken)
        .post('/api/stories')
        .send(storyFixtures.withTitle(stepId, releaseId, duplicateTitle))
        .expect(201);
    });

    it('should create story with optional fields (size, description)', async () => {
      const storyData = {
        title: 'Story with Optional Fields',
        description: 'Detailed description',
        step_id: stepId,
        release_id: releaseId,
        size: 5,
        status: 'READY',
      };

      const response = await authenticatedRequest(app, authToken)
        .post('/api/stories')
        .send(storyData)
        .expect(201);

      expect(response.body).toMatchObject({
        title: storyData.title,
        description: storyData.description,
        size: 5,
        status: 'READY',
      });
    });

    it('should reject invalid status enum value', async () => {
      const invalidData = {
        title: 'Test Story',
        step_id: stepId,
        release_id: releaseId,
        status: 'INVALID_STATUS',
      };

      const response = await authenticatedRequest(app, authToken)
        .post('/api/stories')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('message');
      // Message is an array of validation errors
      expect(Array.isArray(response.body.message)).toBe(true);
      expect(response.body.message[0]).toMatch(/status/i);
    });

    it('should reject invalid size values (zero, negative, non-integer)', async () => {
      // Test size = 0 (violates @Min(1))
      const zeroSize = {
        title: 'Test Story',
        step_id: stepId,
        release_id: releaseId,
        size: 0,
      };

      await authenticatedRequest(app, authToken)
        .post('/api/stories')
        .send(zeroSize)
        .expect(400);

      // Test negative size
      const negativeSize = {
        title: 'Test Story',
        step_id: stepId,
        release_id: releaseId,
        size: -5,
      };

      await authenticatedRequest(app, authToken)
        .post('/api/stories')
        .send(negativeSize)
        .expect(400);

      // Test non-integer
      const floatSize = {
        title: 'Test Story',
        step_id: stepId,
        release_id: releaseId,
        size: 3.5,
      };

      await authenticatedRequest(app, authToken)
        .post('/api/stories')
        .send(floatSize)
        .expect(400);
    });

    it('should create story with all status values (DONE, BLOCKED)', async () => {
      // Test DONE status
      const doneStory = await authenticatedRequest(app, authToken)
        .post('/api/stories')
        .send({
          title: 'Done Story',
          step_id: stepId,
          release_id: releaseId,
          status: 'DONE',
        })
        .expect(201);

      expect(doneStory.body.status).toBe('DONE');

      // Test BLOCKED status
      const blockedStory = await authenticatedRequest(app, authToken)
        .post('/api/stories')
        .send({
          title: 'Blocked Story',
          step_id: stepId,
          release_id: releaseId,
          status: 'BLOCKED',
        })
        .expect(201);

      expect(blockedStory.body.status).toBe('BLOCKED');
    });
  });

  describe('GET /api/stories', () => {
    it('should list all stories in a cell (filtered by step_id and release_id)', async () => {
      // Create multiple stories in the same cell
      const story1Data = storyFixtures.withTitle(
        stepId,
        releaseId,
        'Story 1',
      );
      const story2Data = storyFixtures.withTitle(
        stepId,
        releaseId,
        'Story 2',
      );

      await authenticatedRequest(app, authToken)
        .post('/api/stories')
        .send(story1Data)
        .expect(201);

      await authenticatedRequest(app, authToken)
        .post('/api/stories')
        .send(story2Data)
        .expect(201);

      // Get stories filtered by cell (step_id + release_id)
      const response = await authenticatedRequest(app, authToken)
        .get(`/api/stories?step_id=${stepId}&release_id=${releaseId}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(2);

      // Verify both stories are in the response
      const titles = response.body.map((s: any) => s.title);
      expect(titles).toContain('Story 1');
      expect(titles).toContain('Story 2');

      // Verify sorting by sort_order
      const sortOrders = response.body.map((s: any) => s.sort_order);
      expect(sortOrders).toEqual([...sortOrders].sort((a, b) => a - b));
    });

    it('should return empty array when no stories exist in a cell', async () => {
      // Query cell with no stories
      const response = await authenticatedRequest(app, authToken)
        .get(`/api/stories?step_id=${stepId}&release_id=${releaseId}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(0);
    });

    it('should isolate stories by cell (different step_id or release_id)', async () => {
      // Create a second step and release for testing isolation
      const journey = await createJourney(app, authToken, storyMap.id);
      const step2 = await createStep(app, authToken, journey.id, 'Second Step');
      const release2 = await createRelease(app, authToken, storyMap.id);

      // Create stories in different cells
      await authenticatedRequest(app, authToken)
        .post('/api/stories')
        .send(storyFixtures.withTitle(stepId, releaseId, 'Cell 1-1'))
        .expect(201);

      await authenticatedRequest(app, authToken)
        .post('/api/stories')
        .send(storyFixtures.withTitle(step2.id, releaseId, 'Cell 2-1'))
        .expect(201);

      await authenticatedRequest(app, authToken)
        .post('/api/stories')
        .send(storyFixtures.withTitle(stepId, release2.id, 'Cell 1-2'))
        .expect(201);

      // Query cell 1-1 (stepId, releaseId)
      const cell11Response = await authenticatedRequest(app, authToken)
        .get(`/api/stories?step_id=${stepId}&release_id=${releaseId}`)
        .expect(200);

      expect(cell11Response.body).toHaveLength(1);
      expect(cell11Response.body[0].title).toBe('Cell 1-1');

      // Query cell 2-1 (step2.id, releaseId)
      const cell21Response = await authenticatedRequest(app, authToken)
        .get(`/api/stories?step_id=${step2.id}&release_id=${releaseId}`)
        .expect(200);

      expect(cell21Response.body).toHaveLength(1);
      expect(cell21Response.body[0].title).toBe('Cell 2-1');

      // Query cell 1-2 (stepId, release2.id)
      const cell12Response = await authenticatedRequest(app, authToken)
        .get(`/api/stories?step_id=${stepId}&release_id=${release2.id}`)
        .expect(200);

      expect(cell12Response.body).toHaveLength(1);
      expect(cell12Response.body[0].title).toBe('Cell 1-2');
    });
  });

  describe('GET /api/stories/:id', () => {
    it('should get a single story by ID', async () => {
      const storyData = storyFixtures.minimal(stepId, releaseId);

      const createResponse = await authenticatedRequest(app, authToken)
        .post('/api/stories')
        .send(storyData)
        .expect(201);

      const story = createResponse.body;

      // Get the story by ID
      const response = await authenticatedRequest(app, authToken)
        .get(`/api/stories/${story.id}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: story.id,
        title: storyData.title,
        step_id: stepId,
        release_id: releaseId,
      });
    });

    it('should return 404 for non-existent story', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await authenticatedRequest(app, authToken)
        .get(`/api/stories/${fakeId}`)
        .expect(404);
    });
  });

  describe('PATCH /api/stories/:id', () => {
    it('should update story title and description', async () => {
      const storyData = storyFixtures.minimal(stepId, releaseId);

      const createResponse = await authenticatedRequest(app, authToken)
        .post('/api/stories')
        .send(storyData)
        .expect(201);

      const story = createResponse.body;

      // Update the story
      const updateData = {
        title: 'Updated Title',
        description: 'Updated description',
      };

      const response = await authenticatedRequest(app, authToken)
        .patch(`/api/stories/${story.id}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toMatchObject({
        id: story.id,
        title: 'Updated Title',
        description: 'Updated description',
      });
    });

    it('should return 404 when updating non-existent story', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await authenticatedRequest(app, authToken)
        .patch(`/api/stories/${fakeId}`)
        .send({ title: 'Updated' })
        .expect(404);
    });

    it('should update story status and size', async () => {
      const storyData = storyFixtures.minimal(stepId, releaseId);

      const createResponse = await authenticatedRequest(app, authToken)
        .post('/api/stories')
        .send(storyData)
        .expect(201);

      const story = createResponse.body;

      // Update status and size
      const updateData = {
        status: 'IN_PROGRESS',
        size: 8,
      };

      const response = await authenticatedRequest(app, authToken)
        .patch(`/api/stories/${story.id}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toMatchObject({
        id: story.id,
        status: 'IN_PROGRESS',
        size: 8,
      });
    });

    it('should reject update to invalid step_id (move validation)', async () => {
      const storyData = storyFixtures.minimal(stepId, releaseId);

      const createResponse = await authenticatedRequest(app, authToken)
        .post('/api/stories')
        .send(storyData)
        .expect(201);

      const story = createResponse.body;

      // Try to move to non-existent step
      const response = await authenticatedRequest(app, authToken)
        .patch(`/api/stories/${story.id}`)
        .send({ step_id: 'non-existent-step-id' })
        .expect(404);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toMatch(/step|not found/i);
    });

    it('should reject update to invalid release_id (move validation)', async () => {
      const storyData = storyFixtures.minimal(stepId, releaseId);

      const createResponse = await authenticatedRequest(app, authToken)
        .post('/api/stories')
        .send(storyData)
        .expect(201);

      const story = createResponse.body;

      // Try to move to non-existent release
      const response = await authenticatedRequest(app, authToken)
        .patch(`/api/stories/${story.id}`)
        .send({ release_id: 'non-existent-release-id' })
        .expect(404);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toMatch(/release|not found/i);
    });
  });

  describe('DELETE /api/stories/:id', () => {
    it('should delete a story', async () => {
      const storyData = storyFixtures.withTitle(
        stepId,
        releaseId,
        'Story to Delete',
      );

      const createResponse = await authenticatedRequest(app, authToken)
        .post('/api/stories')
        .send(storyData)
        .expect(201);

      const story = createResponse.body;

      // Delete the story
      const deleteResponse = await authenticatedRequest(app, authToken)
        .delete(`/api/stories/${story.id}`)
        .expect(200);

      // Verify response structure
      expect(deleteResponse.body).toMatchObject({
        success: true,
        dependencies_removed: expect.any(Number),
      });

      // Verify story is gone
      await authenticatedRequest(app, authToken)
        .get(`/api/stories/${story.id}`)
        .expect(404);
    });

    it('should return 404 when deleting non-existent story', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await authenticatedRequest(app, authToken)
        .delete(`/api/stories/${fakeId}`)
        .expect(404);
    });

    // Note: Dependency cleanup and cascade behavior will be tested in Tier 2
    // complex operations tests. For Tier 1, we focus on basic CRUD operations.
  });
});
