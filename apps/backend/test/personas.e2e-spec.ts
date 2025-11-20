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

describe('Personas (E2E) - Tier 1', () => {
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

  describe('POST /api/personas', () => {
    it('should create a persona with valid data', async () => {
      const personaData = personaFixtures.minimal();

      const response = await authenticatedRequest(app, authToken)
        .post('/api/personas')
        .send(personaData)
        .expect(201);

      // Verify response structure
      expect(response.body).toMatchObject({
        id: expect.any(String),
        name: personaData.name,
        description: personaData.description,
        created_at: expect.any(String),
      });
    });

    it('should reject unauthenticated requests', async () => {
      const personaData = personaFixtures.minimal();

      await request(app.getHttpServer())
        .post('/api/personas')
        .send(personaData)
        .expect(401);
    });

    it('should reject invalid data (empty name)', async () => {
      const invalidData = personaFixtures.invalidEmpty();

      const response = await authenticatedRequest(app, authToken)
        .post('/api/personas')
        .send(invalidData)
        .expect(400);

      // Verify error message
      expect(response.body).toHaveProperty('message');
    });

    it('should reject duplicate persona names (unique constraint)', async () => {
      const personaData = personaFixtures.withName('Unique Persona');

      // Create first persona
      await authenticatedRequest(app, authToken)
        .post('/api/personas')
        .send(personaData)
        .expect(201);

      // Attempt to create second persona with same name
      const response = await authenticatedRequest(app, authToken)
        .post('/api/personas')
        .send(personaData)
        .expect(409); // 409 CONFLICT is correct for duplicate unique constraints

      // Verify error message indicates duplicate/unique constraint
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toMatch(/already exists|duplicate|unique/i);
    });
  });

  describe('GET /api/personas', () => {
    it('should list all personas', async () => {
      // Create multiple personas
      const persona1Data = personaFixtures.withName('Admin User');
      const persona2Data = personaFixtures.withName('End User');
      const persona3Data = personaFixtures.withName('Power User');

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
        .get('/api/personas')
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
        .get('/api/personas')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(0);
    });
  });

  describe('GET /api/personas/:id', () => {
    it('should get a single persona by ID', async () => {
      const personaData = personaFixtures.withName('Test Persona');

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
      const personaData = personaFixtures.minimal();

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
      const personaData = personaFixtures.withName('Persona to Delete');

      const createResponse = await authenticatedRequest(app, authToken)
        .post('/api/personas')
        .send(personaData)
        .expect(201);

      const persona = createResponse.body;

      // Delete the persona
      const deleteResponse = await authenticatedRequest(app, authToken)
        .delete(`/api/personas/${persona.id}`)
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
        .delete(`/api/personas/${fakeId}`)
        .expect(404);
    });

    // Note: Cascade deletion from stories will be tested in Tier 2 complex operations tests.
    // For Tier 1, we focus on basic CRUD operations.
  });
});
