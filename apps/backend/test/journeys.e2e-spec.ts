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
import { createStoryMap } from './factories';

describe('Journeys (E2E) - Tier 1', () => {
  let app: INestApplication;
  let authToken: string;
  let storyMap: any;

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    // Auth token is created fresh for each test
    // Database cleanup happens in global setup.ts
    authToken = await createAuthToken(app);
    storyMap = await createStoryMap(app, authToken);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/journeys', () => {
    it('should create a journey with valid data', async () => {
      const journeyData = journeyFixtures.minimal(storyMap.id);

      const response = await authenticatedRequest(app, authToken)
        .post('/api/journeys')
        .send(journeyData)
        .expect(201);

      // Verify response structure
      expect(response.body).toMatchObject({
        id: expect.any(String),
        story_map_id: storyMap.id,
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
      const journeyData = journeyFixtures.minimal(storyMap.id);

      await request(app.getHttpServer())
        .post('/api/journeys')
        .send(journeyData)
        .expect(401);
    });

    it('should reject invalid data (empty name)', async () => {
      const invalidData = journeyFixtures.invalidEmpty(storyMap.id);

      const response = await authenticatedRequest(app, authToken)
        .post('/api/journeys')
        .send(invalidData)
        .expect(400);

      // Verify error message
      expect(response.body).toHaveProperty('message');
    });

    it('should auto-calculate sort_order incrementally', async () => {
      // Create multiple journeys and verify sort_order increments
      const journey1Data = journeyFixtures.withName(storyMap.id, 'First Journey');
      const journey2Data = journeyFixtures.withName(storyMap.id, 'Second Journey');
      const journey3Data = journeyFixtures.withName(storyMap.id, 'Third Journey');

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

      // Verify sort_order increments: 0, 1, 2
      expect(journey1.body.sort_order).toBe(0);
      expect(journey2.body.sort_order).toBe(1);
      expect(journey3.body.sort_order).toBe(2);
    });

    it('should reject duplicate journey names within the same story map', async () => {
      const journeyData = journeyFixtures.withName(storyMap.id, 'Duplicate Journey');

      // Create first journey
      await authenticatedRequest(app, authToken)
        .post('/api/journeys')
        .send(journeyData)
        .expect(201);

      // Try to create second journey with same name - should fail with 409 Conflict
      const response = await authenticatedRequest(app, authToken)
        .post('/api/journeys')
        .send(journeyData)
        .expect(409);

      // Verify error message mentions uniqueness
      expect(response.body).toHaveProperty('message');
      expect(response.body.message.toLowerCase()).toContain('already exists');
    });

    it('should allow duplicate journey names across different story maps', async () => {
      // Create a second story map
      const storyMap2 = await createStoryMap(app, authToken);

      const journeyName = 'Shared Journey Name';
      const journey1Data = journeyFixtures.withName(storyMap.id, journeyName);
      const journey2Data = journeyFixtures.withName(storyMap2.id, journeyName);

      // Create journey in first story map
      const journey1 = await authenticatedRequest(app, authToken)
        .post('/api/journeys')
        .send(journey1Data)
        .expect(201);

      // Create journey with same name in second story map - should succeed
      const journey2 = await authenticatedRequest(app, authToken)
        .post('/api/journeys')
        .send(journey2Data)
        .expect(201);

      // Verify both exist with same name but different story_map_id
      expect(journey1.body.name).toBe(journeyName);
      expect(journey2.body.name).toBe(journeyName);
      expect(journey1.body.story_map_id).toBe(storyMap.id);
      expect(journey2.body.story_map_id).toBe(storyMap2.id);
      expect(journey1.body.id).not.toBe(journey2.body.id);
    });
  });

  describe('GET /api/journeys', () => {
    it('should list all journeys sorted by sort_order', async () => {
      // Create multiple journeys
      const journey1Data = journeyFixtures.withName(storyMap.id, 'Journey 1');
      const journey2Data = journeyFixtures.withName(storyMap.id, 'Journey 2');
      const journey3Data = journeyFixtures.withName(storyMap.id, 'Journey 3');

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
        .get(`/api/journeys?story_map_id=${storyMap.id}`)
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
        .get(`/api/journeys?story_map_id=${storyMap.id}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(0);
    });

    it('should only return journeys for the specified story map (workspace isolation)', async () => {
      // Create a second story map
      const storyMap2 = await createStoryMap(app, authToken);

      // Create journeys in both story maps
      const journey1Data = journeyFixtures.withName(storyMap.id, 'Journey in Map 1');
      const journey2Data = journeyFixtures.withName(storyMap2.id, 'Journey in Map 2');

      const journey1 = await authenticatedRequest(app, authToken)
        .post('/api/journeys')
        .send(journey1Data)
        .expect(201);

      const journey2 = await authenticatedRequest(app, authToken)
        .post('/api/journeys')
        .send(journey2Data)
        .expect(201);

      // Get journeys for first story map
      const response1 = await authenticatedRequest(app, authToken)
        .get(`/api/journeys?story_map_id=${storyMap.id}`)
        .expect(200);

      // Get journeys for second story map
      const response2 = await authenticatedRequest(app, authToken)
        .get(`/api/journeys?story_map_id=${storyMap2.id}`)
        .expect(200);

      // Verify isolation - each story map only sees its own journeys
      expect(response1.body).toHaveLength(1);
      expect(response1.body[0].id).toBe(journey1.body.id);
      expect(response1.body[0].story_map_id).toBe(storyMap.id);

      expect(response2.body).toHaveLength(1);
      expect(response2.body[0].id).toBe(journey2.body.id);
      expect(response2.body[0].story_map_id).toBe(storyMap2.id);
    });
  });

  describe('GET /api/journeys/:id', () => {
    it('should get a single journey by ID', async () => {
      const journeyData = journeyFixtures.withName(storyMap.id, 'Test Journey');

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
        story_map_id: storyMap.id,
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
      const journeyData = journeyFixtures.withName(storyMap.id, 'Original Name');

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
      const journeyData = journeyFixtures.minimal(storyMap.id);

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

    it('should update journey description', async () => {
      const journeyData = journeyFixtures.minimal(storyMap.id);

      const createResponse = await authenticatedRequest(app, authToken)
        .post('/api/journeys')
        .send(journeyData)
        .expect(201);

      const journey = createResponse.body;

      const updateData = {
        description: 'Updated journey description',
      };

      const response = await authenticatedRequest(app, authToken)
        .patch(`/api/journeys/${journey.id}`)
        .send(updateData)
        .expect(200);

      expect(response.body.description).toBe(updateData.description);
      expect(response.body.id).toBe(journey.id);
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
      const journeyData = journeyFixtures.withName(storyMap.id, 'Journey to Delete');

      const createResponse = await authenticatedRequest(app, authToken)
        .post('/api/journeys')
        .send(journeyData)
        .expect(201);

      const journey = createResponse.body;

      // Delete the journey
      await authenticatedRequest(app, authToken)
        .delete(`/api/journeys/${journey.id}?story_map_id=${storyMap.id}`)
        .expect(200);

      // Verify journey is gone
      await authenticatedRequest(app, authToken)
        .get(`/api/journeys/${journey.id}`)
        .expect(404);
    });

    it('should return 404 when deleting non-existent journey', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await authenticatedRequest(app, authToken)
        .delete(`/api/journeys/${fakeId}?story_map_id=${storyMap.id}`)
        .expect(404);
    });

    // Note: Cascade delete to steps and stories will be tested in more detail
    // in Tier 2 complex operations tests. For now, we trust the CASCADE
    // constraint in the database schema.
  });
});
