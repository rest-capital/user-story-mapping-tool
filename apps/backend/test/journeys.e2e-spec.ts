/**
 * Journeys E2E Tests (Tier 1)
 *
 * Tests basic CRUD operations for Journeys:
 * - Create journey with auth
 * - List all journeys (sorted by sort_order)
 * - Get single journey
 * - Update journey
 * - Delete journey (cascades to steps and stories)
 * - Error handling (401, 404)
 *
 * Following patterns from auth.e2e-spec.ts and E2E_TESTING_STRATEGY.md
 * REFACTORED: Using authenticatedRequest helper
 */

import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './helpers/test-app';
import { createAuthToken, authenticatedRequest } from './helpers/auth';
import { journeyFixtures } from './fixtures/journey.fixture';

describe('Journeys (E2E) - Tier 1', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    // Auth token is created fresh for each test
    // Database cleanup happens in global setup.ts
    authToken = await createAuthToken(app);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/journeys', () => {
    it('should create a journey with valid data', async () => {
      const journeyData = journeyFixtures.minimal();

      const response = await authenticatedRequest(app, authToken)
        .post('/api/journeys')
        .send(journeyData)
        .expect(201);

      // Verify response structure
      expect(response.body).toMatchObject({
        id: expect.any(String),
        name: journeyData.name,
        sort_order: expect.any(Number),
        created_at: expect.any(String),
        updated_at: expect.any(String),
        created_by: expect.any(String),
      });

      // Verify sort_order is set (should be 0 for first journey)
      expect(response.body.sort_order).toBeGreaterThanOrEqual(0);
    });

    it('should reject unauthenticated requests', async () => {
      const journeyData = journeyFixtures.minimal();

      await request(app.getHttpServer())
        .post('/api/journeys')
        .send(journeyData)
        .expect(401);
    });

    it('should reject invalid data (empty name)', async () => {
      const invalidData = journeyFixtures.invalidEmpty();

      const response = await authenticatedRequest(app, authToken)
        .post('/api/journeys')
        .send(invalidData)
        .expect(400);

      // Verify error message
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('GET /api/journeys', () => {
    it('should list all journeys sorted by sort_order', async () => {
      // Create multiple journeys
      const journey1Data = journeyFixtures.withName('Journey 1');
      const journey2Data = journeyFixtures.withName('Journey 2');
      const journey3Data = journeyFixtures.withName('Journey 3');

      const journey1 = await authenticatedRequest(app, authToken)
        .post('/api/journeys')
        .send(journey1Data)
        .expect(201);

      const journey2 = await authenticatedRequest(app, authToken)
        .post('/api/journeys')
        .send(journey2Data)
        .expect(201);

      const journey3 = await authenticatedRequest(app, authToken)
        .post('/api/journeys')
        .send(journey3Data)
        .expect(201);

      const response = await authenticatedRequest(app, authToken)
        .get('/api/journeys')
        .expect(200);

      // Verify we get an array
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(3);

      // Verify journeys are sorted by sort_order
      const sortOrders = response.body.map((j: any) => j.sort_order);
      const sortedSortOrders = [...sortOrders].sort((a, b) => a - b);
      expect(sortOrders).toEqual(sortedSortOrders);

      // Verify journeys are present
      const journeyIds = response.body.map((j: any) => j.id);
      expect(journeyIds).toContain(journey1.body.id);
      expect(journeyIds).toContain(journey2.body.id);
      expect(journeyIds).toContain(journey3.body.id);
    });

    it('should return empty array when no journeys exist', async () => {
      const response = await authenticatedRequest(app, authToken)
        .get('/api/journeys')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(0);
    });
  });

  describe('GET /api/journeys/:id', () => {
    it('should get a single journey by ID', async () => {
      const journeyData = journeyFixtures.withName('Test Journey');

      const createResponse = await authenticatedRequest(app, authToken)
        .post('/api/journeys')
        .send(journeyData)
        .expect(201);

      const journey = createResponse.body;

      const response = await authenticatedRequest(app, authToken)
        .get(`/api/journeys/${journey.id}`)
        .expect(200);

      // Verify response matches created journey
      expect(response.body).toMatchObject({
        id: journey.id,
        name: journey.name,
        sort_order: expect.any(Number),
        created_at: expect.any(String),
        updated_at: expect.any(String),
      });
    });

    it('should return 404 for non-existent journey', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      const response = await authenticatedRequest(app, authToken)
        .get(`/api/journeys/${fakeId}`)
        .expect(404);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('PATCH /api/journeys/:id', () => {
    it('should update journey name', async () => {
      const journeyData = journeyFixtures.withName('Original Name');

      const createResponse = await authenticatedRequest(app, authToken)
        .post('/api/journeys')
        .send(journeyData)
        .expect(201);

      const journey = createResponse.body;

      const updateData = {
        name: 'Updated Name',
      };

      const response = await authenticatedRequest(app, authToken)
        .patch(`/api/journeys/${journey.id}`)
        .send(updateData)
        .expect(200);

      // Verify name was updated
      expect(response.body.name).toBe(updateData.name);
      expect(response.body.id).toBe(journey.id);

      // Verify updated_at changed
      expect(response.body.updated_at).not.toBe(journey.updated_at);
    });

    it('should update journey color', async () => {
      const journeyData = journeyFixtures.minimal();

      const createResponse = await authenticatedRequest(app, authToken)
        .post('/api/journeys')
        .send(journeyData)
        .expect(201);

      const journey = createResponse.body;

      const updateData = {
        color: '#FF5733',
      };

      const response = await authenticatedRequest(app, authToken)
        .patch(`/api/journeys/${journey.id}`)
        .send(updateData)
        .expect(200);

      expect(response.body.color).toBe(updateData.color);
    });

    it('should return 404 when updating non-existent journey', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await authenticatedRequest(app, authToken)
        .patch(`/api/journeys/${fakeId}`)
        .send({ name: 'New Name' })
        .expect(404);
    });
  });

  describe('DELETE /api/journeys/:id', () => {
    it('should delete a journey', async () => {
      const journeyData = journeyFixtures.withName('Journey to Delete');

      const createResponse = await authenticatedRequest(app, authToken)
        .post('/api/journeys')
        .send(journeyData)
        .expect(201);

      const journey = createResponse.body;

      // Delete the journey
      await authenticatedRequest(app, authToken)
        .delete(`/api/journeys/${journey.id}`)
        .expect(200);

      // Verify journey is gone
      await authenticatedRequest(app, authToken)
        .get(`/api/journeys/${journey.id}`)
        .expect(404);
    });

    it('should return 404 when deleting non-existent journey', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await authenticatedRequest(app, authToken)
        .delete(`/api/journeys/${fakeId}`)
        .expect(404);
    });

    // Note: Cascade delete to steps and stories will be tested in more detail
    // in Tier 2 complex operations tests. For now, we trust the CASCADE
    // constraint in the database schema.
  });
});
