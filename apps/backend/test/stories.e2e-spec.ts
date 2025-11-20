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
import { createJourney, createStep, createRelease } from './factories';

describe('Stories (E2E) - Tier 1', () => {
  let app: INestApplication;
  let authToken: string;

  // Parent entities required for stories
  let journeyId: string;
  let stepId: string;
  let releaseId: string;

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    // Auth token is created fresh for each test
    // Database cleanup happens in global setup.ts
    authToken = await createAuthToken(app);

    // Create parent entities required for stories using factories
    // Stories require: step_id (Journey > Step) + release_id
    const journey = await createJourney(app, authToken);
    const step = await createStep(app, authToken, journey.id, 'Test Step');
    const release = await createRelease(app, authToken);

    journeyId = journey.id;
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
