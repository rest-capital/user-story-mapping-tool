/**
 * Tags E2E Tests (Tier 1)
 *
 * Tests basic CRUD operations for Tags:
 * - Create tag with auth and validation
 * - List all tags
 * - Get single tag
 * - Delete tag (cascade removes from all stories)
 * - Error handling (401, 404, 400)
 *
 * Note: Tags don't have UPDATE operation - they are immutable (name is unique constraint)
 *
 * Following patterns from journeys.e2e-spec.ts and E2E_TESTING_STRATEGY.md
 * REFACTORED: Using authenticatedRequest helper
 */

import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './helpers/test-app';
import { createAuthToken, authenticatedRequest } from './helpers/auth';
import { tagFixtures } from './fixtures/tag.fixture';
import { createStoryMap } from './factories';

describe('Tags (E2E) - Tier 1', () => {
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

  describe('POST /api/tags', () => {
    it('should create a tag with valid data', async () => {
      const tagData = tagFixtures.minimal(storyMap.id);

      const response = await authenticatedRequest(app, authToken)
        .post('/api/tags')
        .send(tagData)
        .expect(201);

      // Verify response structure
      expect(response.body).toMatchObject({
        id: expect.any(String),
        story_map_id: storyMap.id,
        name: tagData.name,
        created_at: expect.any(String),
      });
    });

    it('should reject unauthenticated requests', async () => {
      const tagData = tagFixtures.minimal(storyMap.id);

      await request(app.getHttpServer())
        .post('/api/tags')
        .send(tagData)
        .expect(401);
    });

    it('should reject invalid data (empty name)', async () => {
      const invalidData = tagFixtures.invalidEmpty(storyMap.id);

      const response = await authenticatedRequest(app, authToken)
        .post('/api/tags')
        .send(invalidData)
        .expect(400);

      // Verify error message
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('GET /api/tags', () => {
    it('should list all tags', async () => {
      // Create multiple tags
      const tag1Data = tagFixtures.withName(storyMap.id, 'Frontend');
      const tag2Data = tagFixtures.withName(storyMap.id, 'Backend');
      const tag3Data = tagFixtures.withName(storyMap.id, 'Bug');

      await authenticatedRequest(app, authToken)
        .post('/api/tags')
        .send(tag1Data)
        .expect(201);

      await authenticatedRequest(app, authToken)
        .post('/api/tags')
        .send(tag2Data)
        .expect(201);

      await authenticatedRequest(app, authToken)
        .post('/api/tags')
        .send(tag3Data)
        .expect(201);

      // Get all tags
      const response = await authenticatedRequest(app, authToken)
        .get(`/api/tags?story_map_id=${storyMap.id}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(3);

      // Verify all tags are in the response
      const names = response.body.map((t: any) => t.name);
      expect(names).toContain('Frontend');
      expect(names).toContain('Backend');
      expect(names).toContain('Bug');
    });

    it('should return empty array when no tags exist', async () => {
      const response = await authenticatedRequest(app, authToken)
        .get(`/api/tags?story_map_id=${storyMap.id}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(0);
    });
  });

  describe('GET /api/tags/:id', () => {
    it('should get a single tag by ID', async () => {
      const tagData = tagFixtures.withName(storyMap.id, 'Test Tag');

      const createResponse = await authenticatedRequest(app, authToken)
        .post('/api/tags')
        .send(tagData)
        .expect(201);

      const tag = createResponse.body;

      // Get the tag by ID
      const response = await authenticatedRequest(app, authToken)
        .get(`/api/tags/${tag.id}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: tag.id,
        name: 'Test Tag',
      });
    });

    it('should return 404 for non-existent tag', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await authenticatedRequest(app, authToken)
        .get(`/api/tags/${fakeId}`)
        .expect(404);
    });
  });

  describe('PATCH /api/tags/:id', () => {
    it('should reject UPDATE operations (tags are immutable)', async () => {
      const tagData = tagFixtures.withName(storyMap.id, 'Immutable Tag');

      const createResponse = await authenticatedRequest(app, authToken)
        .post('/api/tags')
        .send(tagData)
        .expect(201);

      const tag = createResponse.body;

      // Attempt to update the tag (should fail - tags are immutable)
      await authenticatedRequest(app, authToken)
        .patch(`/api/tags/${tag.id}`)
        .send({ name: 'New Name' })
        .expect(404); // 404 because PATCH route doesn't exist
    });
  });

  describe('DELETE /api/tags/:id', () => {
    it('should delete a tag', async () => {
      const tagData = tagFixtures.withName(storyMap.id, 'Tag to Delete');

      const createResponse = await authenticatedRequest(app, authToken)
        .post('/api/tags')
        .send(tagData)
        .expect(201);

      const tag = createResponse.body;

      // Delete the tag
      const deleteResponse = await authenticatedRequest(app, authToken)
        .delete(`/api/tags/${tag.id}?story_map_id=${storyMap.id}`)
        .expect(200);

      // Verify response structure
      expect(deleteResponse.body).toMatchObject({
        success: true,
      });

      // Verify tag is gone
      await authenticatedRequest(app, authToken)
        .get(`/api/tags/${tag.id}`)
        .expect(404);
    });

    it('should return 404 when deleting non-existent tag', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await authenticatedRequest(app, authToken)
        .delete(`/api/tags/${fakeId}?story_map_id=${storyMap.id}`)
        .expect(404);
    });

    // Note: Cascade deletion from stories will be tested in Tier 2 complex operations tests.
    // For Tier 1, we focus on basic CRUD operations.
  });
});
