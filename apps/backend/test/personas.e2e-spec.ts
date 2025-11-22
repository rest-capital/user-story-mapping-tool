/**
 * Personas E2E Tests (Tier 1)
 *
 * Tests basic CRUD operations for Personas:
 * - Create persona with auth and validation
 * - List all personas
 * - Get single persona
 * - Update persona
 * - Delete persona (cascade removes from all stories)
 * - Error handling (401, 404, 400)
 *
 * Following patterns from journeys.e2e-spec.ts and E2E_TESTING_STRATEGY.md
 * REFACTORED: Using authenticatedRequest helper
 */

import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './helpers/test-app';
import { createAuthToken, authenticatedRequest } from './helpers/auth';
import { personaFixtures } from './fixtures/persona.fixture';
import { createStoryMap } from './factories';

describe('Personas (E2E) - Tier 1', () => {
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

  describe('POST /api/personas', () => {
    it('should create a persona with valid data', async () => {
      const personaData = personaFixtures.minimal(storyMap.id);

      const response = await authenticatedRequest(app, authToken)
        .post('/api/personas')
        .send(personaData)
        .expect(201);

      // Verify response structure
      expect(response.body).toMatchObject({
        id: expect.any(String),
        story_map_id: storyMap.id,
        name: personaData.name,
        description: personaData.description,
        created_at: expect.any(String),
      });
    });

    it('should create a persona with avatar_url', async () => {
      const personaData = {
        ...personaFixtures.minimal(storyMap.id),
        avatar_url: 'https://example.com/avatar.png',
      };

      const response = await authenticatedRequest(app, authToken)
        .post('/api/personas')
        .send(personaData)
        .expect(201);

      // Verify avatar_url is stored
      expect(response.body).toMatchObject({
        id: expect.any(String),
        story_map_id: storyMap.id,
        name: personaData.name,
        description: personaData.description,
        avatar_url: 'https://example.com/avatar.png',
        created_at: expect.any(String),
      });
    });

    it('should reject unauthenticated requests', async () => {
      const personaData = personaFixtures.minimal(storyMap.id);

      await request(app.getHttpServer())
        .post('/api/personas')
        .send(personaData)
        .expect(401);
    });

    it('should reject invalid data (empty name)', async () => {
      const invalidData = personaFixtures.invalidEmpty(storyMap.id);

      const response = await authenticatedRequest(app, authToken)
        .post('/api/personas')
        .send(invalidData)
        .expect(400);

      // Verify error message
      expect(response.body).toHaveProperty('message');
    });

    it('should reject duplicate persona names within the same story map', async () => {
      const personaData = personaFixtures.withName(storyMap.id, 'Unique Persona');

      // Create first persona
      await authenticatedRequest(app, authToken)
        .post('/api/personas')
        .send(personaData)
        .expect(201);

      // Attempt to create second persona with same name in same story map
      const response = await authenticatedRequest(app, authToken)
        .post('/api/personas')
        .send(personaData)
        .expect(409); // 409 CONFLICT is correct for duplicate unique constraints

      // Verify error message indicates duplicate/unique constraint
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toMatch(/already exists|duplicate|unique/i);
    });

    it('should allow duplicate persona names across different story maps', async () => {
      // Create a second story map
      const storyMap2 = await createStoryMap(app, authToken);

      // Create personas with same name in different story maps
      const persona1Data = personaFixtures.withName(storyMap.id, 'Shared Name');
      const persona2Data = personaFixtures.withName(storyMap2.id, 'Shared Name');

      // Both should succeed (different story maps)
      const response1 = await authenticatedRequest(app, authToken)
        .post('/api/personas')
        .send(persona1Data)
        .expect(201);

      const response2 = await authenticatedRequest(app, authToken)
        .post('/api/personas')
        .send(persona2Data)
        .expect(201);

      // Verify both were created with same name but different story_map_ids
      expect(response1.body.name).toBe('Shared Name');
      expect(response2.body.name).toBe('Shared Name');
      expect(response1.body.story_map_id).toBe(storyMap.id);
      expect(response2.body.story_map_id).toBe(storyMap2.id);
      expect(response1.body.id).not.toBe(response2.body.id);
    });
  });

  describe('GET /api/personas', () => {
    it('should list all personas', async () => {
      // Create multiple personas
      const persona1Data = personaFixtures.withName(storyMap.id, 'Admin User');
      const persona2Data = personaFixtures.withName(storyMap.id, 'End User');
      const persona3Data = personaFixtures.withName(storyMap.id, 'Power User');

      await authenticatedRequest(app, authToken)
        .post('/api/personas')
        .send(persona1Data)
        .expect(201);

      await authenticatedRequest(app, authToken)
        .post('/api/personas')
        .send(persona2Data)
        .expect(201);

      await authenticatedRequest(app, authToken)
        .post('/api/personas')
        .send(persona3Data)
        .expect(201);

      // Get all personas
      const response = await authenticatedRequest(app, authToken)
        .get(`/api/personas?story_map_id=${storyMap.id}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(3);

      // Verify all personas are in the response
      const names = response.body.map((p: any) => p.name);
      expect(names).toContain('Admin User');
      expect(names).toContain('End User');
      expect(names).toContain('Power User');
    });

    it('should return empty array when no personas exist', async () => {
      const response = await authenticatedRequest(app, authToken)
        .get(`/api/personas?story_map_id=${storyMap.id}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(0);
    });

    it('should only return personas for the specified story map (workspace isolation)', async () => {
      // Create a second story map
      const storyMap2 = await createStoryMap(app, authToken);

      // Create personas in different story maps
      const persona1Data = personaFixtures.withName(storyMap.id, 'Persona in Map 1');
      const persona2Data = personaFixtures.withName(storyMap2.id, 'Persona in Map 2');

      const persona1 = await authenticatedRequest(app, authToken)
        .post('/api/personas')
        .send(persona1Data)
        .expect(201);

      const persona2 = await authenticatedRequest(app, authToken)
        .post('/api/personas')
        .send(persona2Data)
        .expect(201);

      // Get personas for first story map
      const response1 = await authenticatedRequest(app, authToken)
        .get(`/api/personas?story_map_id=${storyMap.id}`)
        .expect(200);

      // Get personas for second story map
      const response2 = await authenticatedRequest(app, authToken)
        .get(`/api/personas?story_map_id=${storyMap2.id}`)
        .expect(200);

      // Verify isolation - each story map only sees its own personas
      expect(response1.body).toHaveLength(1);
      expect(response1.body[0].id).toBe(persona1.body.id);
      expect(response1.body[0].story_map_id).toBe(storyMap.id);

      expect(response2.body).toHaveLength(1);
      expect(response2.body[0].id).toBe(persona2.body.id);
      expect(response2.body[0].story_map_id).toBe(storyMap2.id);
    });
  });

  describe('GET /api/personas/:id', () => {
    it('should get a single persona by ID', async () => {
      const personaData = personaFixtures.withName(storyMap.id, 'Test Persona');

      const createResponse = await authenticatedRequest(app, authToken)
        .post('/api/personas')
        .send(personaData)
        .expect(201);

      const persona = createResponse.body;

      // Get the persona by ID
      const response = await authenticatedRequest(app, authToken)
        .get(`/api/personas/${persona.id}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: persona.id,
        name: 'Test Persona',
        description: personaData.description,
      });
    });

    it('should return 404 for non-existent persona', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await authenticatedRequest(app, authToken)
        .get(`/api/personas/${fakeId}`)
        .expect(404);
    });
  });

  describe('PATCH /api/personas/:id', () => {
    it('should update persona name and description', async () => {
      const personaData = personaFixtures.minimal(storyMap.id);

      const createResponse = await authenticatedRequest(app, authToken)
        .post('/api/personas')
        .send(personaData)
        .expect(201);

      const persona = createResponse.body;

      // Update the persona
      const updateData = {
        name: 'Updated Persona',
        description: 'Updated description',
      };

      const response = await authenticatedRequest(app, authToken)
        .patch(`/api/personas/${persona.id}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toMatchObject({
        id: persona.id,
        name: 'Updated Persona',
        description: 'Updated description',
      });
    });

    it('should update persona avatar_url', async () => {
      const personaData = personaFixtures.minimal(storyMap.id);

      const createResponse = await authenticatedRequest(app, authToken)
        .post('/api/personas')
        .send(personaData)
        .expect(201);

      const persona = createResponse.body;

      // Update the avatar_url
      const updateData = {
        avatar_url: 'https://example.com/new-avatar.png',
      };

      const response = await authenticatedRequest(app, authToken)
        .patch(`/api/personas/${persona.id}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toMatchObject({
        id: persona.id,
        avatar_url: 'https://example.com/new-avatar.png',
      });
    });

    it('should return 404 when updating non-existent persona', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await authenticatedRequest(app, authToken)
        .patch(`/api/personas/${fakeId}`)
        .send({ name: 'Updated' })
        .expect(404);
    });
  });

  describe('DELETE /api/personas/:id', () => {
    it('should delete a persona', async () => {
      const personaData = personaFixtures.withName(storyMap.id, 'Persona to Delete');

      const createResponse = await authenticatedRequest(app, authToken)
        .post('/api/personas')
        .send(personaData)
        .expect(201);

      const persona = createResponse.body;

      // Delete the persona
      const deleteResponse = await authenticatedRequest(app, authToken)
        .delete(`/api/personas/${persona.id}?story_map_id=${storyMap.id}`)
        .expect(200);

      // Verify response structure
      expect(deleteResponse.body).toMatchObject({
        success: true,
      });

      // Verify persona is gone
      await authenticatedRequest(app, authToken)
        .get(`/api/personas/${persona.id}`)
        .expect(404);
    });

    it('should return 404 when deleting non-existent persona', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await authenticatedRequest(app, authToken)
        .delete(`/api/personas/${fakeId}?story_map_id=${storyMap.id}`)
        .expect(404);
    });

    // Note: Cascade deletion from stories will be tested in Tier 2 complex operations tests.
    // For Tier 1, we focus on basic CRUD operations.
  });
});
