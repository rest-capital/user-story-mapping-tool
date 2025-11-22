/**
 * Steps E2E Tests (Tier 1)
 *
 * Tests basic CRUD operations for Steps:
 * - Create step with auth and foreign key validation
 * - List all steps (sorted by sort_order)
 * - Get single step
 * - Update step
 * - Delete step (cascades to stories)
 * - Error handling (401, 404, 400)
 *
 * Following patterns from journeys.e2e-spec.ts and E2E_TESTING_STRATEGY.md
 * REFACTORED: Using factory pattern for parent entity creation
 */

import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './helpers/test-app';
import { createAuthToken, authenticatedRequest } from './helpers/auth';
import { stepFixtures } from './fixtures/step.fixture';
import { createJourney, createStoryMap } from './factories';

describe('Steps (E2E) - Tier 1', () => {
  let app: INestApplication;
  let authToken: string;
  let storyMap: any;
  let journeyId: string; // Steps belong to a journey

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    // Auth token is created fresh for each test
    // Database cleanup happens in global setup.ts
    authToken = await createAuthToken(app);
    storyMap = await createStoryMap(app, authToken);

    // Create a journey for step tests using factory (steps require a journey_id)
    const journey = await createJourney(app, authToken, storyMap.id);
    journeyId = journey.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/steps', () => {
    it('should create a step with valid data', async () => {
      const stepData = stepFixtures.minimal(journeyId);

      const response = await authenticatedRequest(app, authToken)
        .post('/api/steps')
        .send(stepData)
        .expect(201);

      // Verify response structure
      expect(response.body).toMatchObject({
        id: expect.any(String),
        name: stepData.name,
        journey_id: journeyId,
        sort_order: expect.any(Number),
        created_at: expect.any(String),
        updated_at: expect.any(String),
      });

      // Verify sort_order is set (should be 0 for first step)
      expect(response.body.sort_order).toBeGreaterThanOrEqual(0);
    });

    it('should auto-calculate sort_order incrementally', async () => {
      // Create three steps
      const step1Data = stepFixtures.withName(journeyId, 'Step 1');
      const step2Data = stepFixtures.withName(journeyId, 'Step 2');
      const step3Data = stepFixtures.withName(journeyId, 'Step 3');

      const step1 = await authenticatedRequest(app, authToken)
        .post('/api/steps')
        .send(step1Data)
        .expect(201);

      const step2 = await authenticatedRequest(app, authToken)
        .post('/api/steps')
        .send(step2Data)
        .expect(201);

      const step3 = await authenticatedRequest(app, authToken)
        .post('/api/steps')
        .send(step3Data)
        .expect(201);

      // Verify sort_order increments: 0, 1, 2
      expect(step1.body.sort_order).toBe(0);
      expect(step2.body.sort_order).toBe(1);
      expect(step3.body.sort_order).toBe(2);
    });

    it('should create a step with description', async () => {
      const stepData = {
        ...stepFixtures.minimal(journeyId),
        description: 'This is a detailed step description',
      };

      const response = await authenticatedRequest(app, authToken)
        .post('/api/steps')
        .send(stepData)
        .expect(201);

      // Verify description is stored
      expect(response.body).toMatchObject({
        id: expect.any(String),
        name: stepData.name,
        description: 'This is a detailed step description',
        journey_id: journeyId,
      });
    });

    it('should reject unauthenticated requests', async () => {
      const stepData = stepFixtures.minimal(journeyId);

      await request(app.getHttpServer())
        .post('/api/steps')
        .send(stepData)
        .expect(401);
    });

    it('should reject invalid data (empty name)', async () => {
      const invalidData = stepFixtures.invalidEmpty(journeyId);

      const response = await authenticatedRequest(app, authToken)
        .post('/api/steps')
        .send(invalidData)
        .expect(400);

      // Verify error message
      expect(response.body).toHaveProperty('message');
    });

    it('should reject invalid foreign key (non-existent journey)', async () => {
      const invalidData = stepFixtures.invalidJourneyId();

      const response = await authenticatedRequest(app, authToken)
        .post('/api/steps')
        .send(invalidData)
        .expect(404); // Service validates journey exists first

      // Verify error message mentions journey not found
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toMatch(/journey.*not found/i);
    });

    it('should allow duplicate step names within the same journey', async () => {
      // Steps have NO unique constraint on name (unlike journeys)
      // Multiple steps can have the same name within a journey
      const stepData1 = stepFixtures.withName(journeyId, 'Research');
      const stepData2 = stepFixtures.withName(journeyId, 'Research'); // Same name!

      const step1 = await authenticatedRequest(app, authToken)
        .post('/api/steps')
        .send(stepData1)
        .expect(201);

      // This should succeed (duplicate names allowed)
      const step2 = await authenticatedRequest(app, authToken)
        .post('/api/steps')
        .send(stepData2)
        .expect(201);

      // Verify both steps exist with same name but different IDs
      expect(step1.body.name).toBe('Research');
      expect(step2.body.name).toBe('Research');
      expect(step1.body.id).not.toBe(step2.body.id);
    });
  });

  describe('GET /api/steps', () => {
    it('should list all steps sorted by sort_order', async () => {
      // Create multiple steps
      const step1Data = stepFixtures.withName(journeyId, 'Step 1');
      const step2Data = stepFixtures.withName(journeyId, 'Step 2');
      const step3Data = stepFixtures.withName(journeyId, 'Step 3');

      const step1 = await authenticatedRequest(app, authToken)
        .post('/api/steps')
        .send(step1Data)
        .expect(201);

      const step2 = await authenticatedRequest(app, authToken)
        .post('/api/steps')
        .send(step2Data)
        .expect(201);

      const step3 = await authenticatedRequest(app, authToken)
        .post('/api/steps')
        .send(step3Data)
        .expect(201);

      const response = await authenticatedRequest(app, authToken)
        .get('/api/steps')
        .expect(200);

      // Verify we get an array
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(3);

      // Verify steps are sorted by sort_order
      const sortOrders = response.body.map((s: any) => s.sort_order);
      const sortedSortOrders = [...sortOrders].sort((a, b) => a - b);
      expect(sortOrders).toEqual(sortedSortOrders);

      // Verify steps are present
      const stepIds = response.body.map((s: any) => s.id);
      expect(stepIds).toContain(step1.body.id);
      expect(stepIds).toContain(step2.body.id);
      expect(stepIds).toContain(step3.body.id);
    });

    it('should return empty array when no steps exist', async () => {
      const response = await authenticatedRequest(app, authToken)
        .get('/api/steps')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(0);
    });

    it('should only return steps for the specified journey (journey scoping)', async () => {
      // Create a second journey
      const journey2 = await createJourney(app, authToken, storyMap.id);

      // Create steps in different journeys
      const step1Data = stepFixtures.withName(journeyId, 'Step in Journey 1');
      const step2Data = stepFixtures.withName(journey2.id, 'Step in Journey 2');

      const step1 = await authenticatedRequest(app, authToken)
        .post('/api/steps')
        .send(step1Data)
        .expect(201);

      const step2 = await authenticatedRequest(app, authToken)
        .post('/api/steps')
        .send(step2Data)
        .expect(201);

      // Get steps for first journey using nested route
      const response1 = await authenticatedRequest(app, authToken)
        .get(`/api/journeys/${journeyId}/steps`)
        .expect(200);

      // Get steps for second journey using nested route
      const response2 = await authenticatedRequest(app, authToken)
        .get(`/api/journeys/${journey2.id}/steps`)
        .expect(200);

      // Verify scoping - each journey only sees its own steps
      expect(response1.body).toHaveLength(1);
      expect(response1.body[0].id).toBe(step1.body.id);
      expect(response1.body[0].journey_id).toBe(journeyId);

      expect(response2.body).toHaveLength(1);
      expect(response2.body[0].id).toBe(step2.body.id);
      expect(response2.body[0].journey_id).toBe(journey2.id);
    });
  });

  describe('GET /api/steps/:id', () => {
    it('should get a single step by ID', async () => {
      const stepData = stepFixtures.withName(journeyId, 'Test Step');

      const createResponse = await authenticatedRequest(app, authToken)
        .post('/api/steps')
        .send(stepData)
        .expect(201);

      const step = createResponse.body;

      const response = await authenticatedRequest(app, authToken)
        .get(`/api/steps/${step.id}`)
        .expect(200);

      // Verify response matches created step
      expect(response.body).toMatchObject({
        id: step.id,
        name: step.name,
        journey_id: journeyId,
        sort_order: expect.any(Number),
        created_at: expect.any(String),
        updated_at: expect.any(String),
      });
    });

    it('should return 404 for non-existent step', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      const response = await authenticatedRequest(app, authToken)
        .get(`/api/steps/${fakeId}`)
        .expect(404);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('PATCH /api/steps/:id', () => {
    it('should update step name', async () => {
      const stepData = stepFixtures.withName(journeyId, 'Original Name');

      const createResponse = await authenticatedRequest(app, authToken)
        .post('/api/steps')
        .send(stepData)
        .expect(201);

      const step = createResponse.body;

      const updateData = {
        name: 'Updated Name',
      };

      const response = await authenticatedRequest(app, authToken)
        .patch(`/api/steps/${step.id}`)
        .send(updateData)
        .expect(200);

      // Verify name was updated
      expect(response.body.name).toBe(updateData.name);
      expect(response.body.id).toBe(step.id);

      // Verify updated_at changed
      expect(response.body.updated_at).not.toBe(step.updated_at);
    });

    it('should update step description', async () => {
      const stepData = stepFixtures.minimal(journeyId);

      const createResponse = await authenticatedRequest(app, authToken)
        .post('/api/steps')
        .send(stepData)
        .expect(201);

      const step = createResponse.body;

      // Update the description
      const updateData = {
        description: 'Updated step description',
      };

      const response = await authenticatedRequest(app, authToken)
        .patch(`/api/steps/${step.id}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toMatchObject({
        id: step.id,
        description: 'Updated step description',
      });
    });

    it('should return 404 when updating non-existent step', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await authenticatedRequest(app, authToken)
        .patch(`/api/steps/${fakeId}`)
        .send({ name: 'New Name' })
        .expect(404);
    });
  });

  describe('DELETE /api/steps/:id', () => {
    it('should delete a step', async () => {
      const stepData = stepFixtures.withName(journeyId, 'Step to Delete');

      const createResponse = await authenticatedRequest(app, authToken)
        .post('/api/steps')
        .send(stepData)
        .expect(201);

      const step = createResponse.body;

      // Delete the step
      await authenticatedRequest(app, authToken)
        .delete(`/api/steps/${step.id}`)
        .expect(200);

      // Verify step is gone
      await authenticatedRequest(app, authToken)
        .get(`/api/steps/${step.id}`)
        .expect(404);
    });

    it('should return 404 when deleting non-existent step', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await authenticatedRequest(app, authToken)
        .delete(`/api/steps/${fakeId}`)
        .expect(404);
    });

    // Note: Cascade delete to stories will be tested in more detail
    // in Tier 2 complex operations tests. For now, we trust the CASCADE
    // constraint in the database schema.
  });
});
