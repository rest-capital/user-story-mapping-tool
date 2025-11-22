/**
 * StoryMaps E2E Tests (Tier 1)
 *
 * Tests basic CRUD operations for StoryMaps:
 * - Create story map with auth
 * - List all story maps
 * - Get single story map
 * - Update story map
 * - Delete story map (cascades to all child entities)
 * - Auto-creation of Unassigned release on creation
 * - Error handling (401, 404)
 *
 * Following patterns from journeys.e2e-spec.ts and E2E_TESTING_STRATEGY.md
 */

import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './helpers/test-app';
import { createAuthToken, authenticatedRequest } from './helpers/auth';
import { storyMapFixtures } from './fixtures/story-map.fixture';

describe('StoryMaps (E2E) - Tier 1', () => {
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

  describe('POST /api/story-maps', () => {
    it('should create a story map with valid data', async () => {
      const storyMapData = storyMapFixtures.minimal();

      const response = await authenticatedRequest(app, authToken)
        .post('/api/story-maps')
        .send(storyMapData)
        .expect(201);

      // Verify response structure
      expect(response.body).toMatchObject({
        id: expect.any(String),
        name: storyMapData.name,
        description: expect.any(String),
        created_at: expect.any(String),
        updated_at: expect.any(String),
        created_by: expect.any(String),
      });
    });

    it('should auto-create Unassigned release on story map creation', async () => {
      const storyMapData = storyMapFixtures.withName('Test Map');

      const createResponse = await authenticatedRequest(app, authToken)
        .post('/api/story-maps')
        .send(storyMapData)
        .expect(201);

      const storyMap = createResponse.body;

      // Verify Unassigned release was created
      const releasesResponse = await authenticatedRequest(app, authToken)
        .get(`/api/releases?story_map_id=${storyMap.id}`)
        .expect(200);

      const unassigned = releasesResponse.body.find((r: any) => r.is_unassigned === true);

      expect(unassigned).toBeDefined();
      expect(unassigned.name).toBe('Unassigned');
      expect(unassigned.sort_order).toBe(0);
      expect(unassigned.story_map_id).toBe(storyMap.id);
    });

    it('should reject unauthenticated requests', async () => {
      const storyMapData = storyMapFixtures.minimal();

      await request(app.getHttpServer())
        .post('/api/story-maps')
        .send(storyMapData)
        .expect(401);
    });

    it('should reject invalid data (empty name)', async () => {
      const invalidData = storyMapFixtures.invalidEmpty();

      const response = await authenticatedRequest(app, authToken)
        .post('/api/story-maps')
        .send(invalidData)
        .expect(400);

      // Verify error message
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('GET /api/story-maps', () => {
    it('should list all story maps for the current user', async () => {
      // Create multiple story maps
      const storyMap1Data = storyMapFixtures.withName('Story Map 1');
      const storyMap2Data = storyMapFixtures.withName('Story Map 2');
      const storyMap3Data = storyMapFixtures.withName('Story Map 3');

      const storyMap1 = await authenticatedRequest(app, authToken)
        .post('/api/story-maps')
        .send(storyMap1Data)
        .expect(201);

      const storyMap2 = await authenticatedRequest(app, authToken)
        .post('/api/story-maps')
        .send(storyMap2Data)
        .expect(201);

      const storyMap3 = await authenticatedRequest(app, authToken)
        .post('/api/story-maps')
        .send(storyMap3Data)
        .expect(201);

      const response = await authenticatedRequest(app, authToken)
        .get('/api/story-maps')
        .expect(200);

      // Verify we get an array
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(3);

      // Verify story maps are present
      const storyMapIds = response.body.map((sm: any) => sm.id);
      expect(storyMapIds).toContain(storyMap1.body.id);
      expect(storyMapIds).toContain(storyMap2.body.id);
      expect(storyMapIds).toContain(storyMap3.body.id);
    });

    it('should return empty array when no story maps exist', async () => {
      const response = await authenticatedRequest(app, authToken)
        .get('/api/story-maps')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(0);
    });
  });

  describe('GET /api/story-maps/:id', () => {
    it('should get a single story map by ID', async () => {
      const storyMapData = storyMapFixtures.withName('Test Story Map');

      const createResponse = await authenticatedRequest(app, authToken)
        .post('/api/story-maps')
        .send(storyMapData)
        .expect(201);

      const storyMap = createResponse.body;

      const response = await authenticatedRequest(app, authToken)
        .get(`/api/story-maps/${storyMap.id}`)
        .expect(200);

      // Verify response matches created story map
      expect(response.body).toMatchObject({
        id: storyMap.id,
        name: storyMap.name,
        created_at: expect.any(String),
        updated_at: expect.any(String),
      });
    });

    it('should return 404 for non-existent story map', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      const response = await authenticatedRequest(app, authToken)
        .get(`/api/story-maps/${fakeId}`)
        .expect(404);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('PATCH /api/story-maps/:id', () => {
    it('should update story map name', async () => {
      const storyMapData = storyMapFixtures.withName('Original Name');

      const createResponse = await authenticatedRequest(app, authToken)
        .post('/api/story-maps')
        .send(storyMapData)
        .expect(201);

      const storyMap = createResponse.body;

      const updateData = {
        name: 'Updated Name',
      };

      const response = await authenticatedRequest(app, authToken)
        .patch(`/api/story-maps/${storyMap.id}`)
        .send(updateData)
        .expect(200);

      // Verify name was updated
      expect(response.body.name).toBe(updateData.name);
      expect(response.body.id).toBe(storyMap.id);

      // Verify updated_at changed
      expect(response.body.updated_at).not.toBe(storyMap.updated_at);
    });

    it('should update story map description', async () => {
      const storyMapData = storyMapFixtures.minimal();

      const createResponse = await authenticatedRequest(app, authToken)
        .post('/api/story-maps')
        .send(storyMapData)
        .expect(201);

      const storyMap = createResponse.body;

      const updateData = {
        description: 'New description for the story map',
      };

      const response = await authenticatedRequest(app, authToken)
        .patch(`/api/story-maps/${storyMap.id}`)
        .send(updateData)
        .expect(200);

      expect(response.body.description).toBe(updateData.description);
    });

    it('should return 404 when updating non-existent story map', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await authenticatedRequest(app, authToken)
        .patch(`/api/story-maps/${fakeId}`)
        .send({ name: 'New Name' })
        .expect(404);
    });
  });

  describe('DELETE /api/story-maps/:id', () => {
    it('should delete a story map', async () => {
      const storyMapData = storyMapFixtures.withName('Story Map to Delete');

      const createResponse = await authenticatedRequest(app, authToken)
        .post('/api/story-maps')
        .send(storyMapData)
        .expect(201);

      const storyMap = createResponse.body;

      // Delete the story map
      await authenticatedRequest(app, authToken)
        .delete(`/api/story-maps/${storyMap.id}`)
        .expect(200);

      // Verify story map is gone
      await authenticatedRequest(app, authToken)
        .get(`/api/story-maps/${storyMap.id}`)
        .expect(404);
    });

    it('should return 404 when deleting non-existent story map', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await authenticatedRequest(app, authToken)
        .delete(`/api/story-maps/${fakeId}`)
        .expect(404);
    });

    // Note: Cascade delete to all child entities (journeys, releases, tags, personas, etc.)
    // will be tested in cascade-deletes.e2e-spec.ts
  });
});
