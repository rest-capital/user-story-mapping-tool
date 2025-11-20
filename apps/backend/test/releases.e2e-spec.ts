/**
 * Releases E2E Tests (Tier 1)
 *
 * Tests basic CRUD operations for Releases:
 * - Create release with auth and validation
 * - List all releases (sorted by sort_order)
 * - Get single release
 * - Update release
 * - Delete release
 * - Special case: Unassigned release cannot be deleted
 * - Error handling (401, 404, 400)
 *
 * Following patterns from journeys.e2e-spec.ts and E2E_TESTING_STRATEGY.md
 * REFACTORED: Using authenticatedRequest helper
 */

import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './helpers/test-app';
import { createAuthToken, authenticatedRequest } from './helpers/auth';
import { releaseFixtures } from './fixtures/release.fixture';
import { ensureUnassignedRelease } from './helpers/release-setup';

describe('Releases (E2E) - Tier 1', () => {
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

  describe('POST /api/releases', () => {
    it('should create a release with valid data', async () => {
      const releaseData = releaseFixtures.minimal();

      const response = await authenticatedRequest(app, authToken)
        .post('/api/releases')
        .send(releaseData)
        .expect(201);

      // Verify response structure
      expect(response.body).toMatchObject({
        id: expect.any(String),
        name: releaseData.name,
        description: releaseData.description,
        sort_order: expect.any(Number),
        shipped: false,
        is_unassigned: false,
        created_at: expect.any(String),
        updated_at: expect.any(String),
      });

      // Verify sort_order is set
      expect(response.body.sort_order).toBeGreaterThanOrEqual(0);
    });

    it('should reject unauthenticated requests', async () => {
      const releaseData = releaseFixtures.minimal();

      await request(app.getHttpServer())
        .post('/api/releases')
        .send(releaseData)
        .expect(401);
    });

    it('should reject invalid data (empty name)', async () => {
      const invalidData = releaseFixtures.invalidEmpty();

      const response = await authenticatedRequest(app, authToken)
        .post('/api/releases')
        .send(invalidData)
        .expect(400);

      // Verify error message
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('GET /api/releases', () => {
    it('should list all releases sorted by sort_order', async () => {
      // Create multiple releases
      const release1Data = releaseFixtures.withName('Release 1');
      const release2Data = releaseFixtures.withName('Release 2');
      const release3Data = releaseFixtures.withName('Release 3');

      const release1 = await authenticatedRequest(app, authToken)
        .post('/api/releases')
        .send(release1Data)
        .expect(201);

      const release2 = await authenticatedRequest(app, authToken)
        .post('/api/releases')
        .send(release2Data)
        .expect(201);

      const release3 = await authenticatedRequest(app, authToken)
        .post('/api/releases')
        .send(release3Data)
        .expect(201);

      const response = await authenticatedRequest(app, authToken)
        .get('/api/releases')
        .expect(200);

      // Verify we get an array
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(4); // Includes Unassigned release

      // Verify releases are sorted by sort_order
      const sortOrders = response.body.map((r: any) => r.sort_order);
      const sortedSortOrders = [...sortOrders].sort((a, b) => a - b);
      expect(sortOrders).toEqual(sortedSortOrders);

      // Verify Unassigned is first
      expect(response.body[0].is_unassigned).toBe(true);
      expect(response.body[0].sort_order).toBe(0);

      // Verify created releases are present
      const releaseIds = response.body.map((r: any) => r.id);
      expect(releaseIds).toContain(release1.body.id);
      expect(releaseIds).toContain(release2.body.id);
      expect(releaseIds).toContain(release3.body.id);
    });

    it('should return only the Unassigned release when no custom releases exist', async () => {
      const response = await authenticatedRequest(app, authToken)
        .get('/api/releases')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(1); // Only Unassigned release
      expect(response.body[0].is_unassigned).toBe(true);
      expect(response.body[0].name).toBe('Unassigned');
    });
  });

  describe('GET /api/releases/:id', () => {
    it('should get a single release by ID', async () => {
      const releaseData = releaseFixtures.withName('Test Release');

      const createResponse = await authenticatedRequest(app, authToken)
        .post('/api/releases')
        .send(releaseData)
        .expect(201);

      const release = createResponse.body;

      const response = await authenticatedRequest(app, authToken)
        .get(`/api/releases/${release.id}`)
        .expect(200);

      // Verify response matches created release
      expect(response.body).toMatchObject({
        id: release.id,
        name: release.name,
        description: release.description,
        sort_order: expect.any(Number),
        shipped: false,
        is_unassigned: false,
        created_at: expect.any(String),
        updated_at: expect.any(String),
      });
    });

    it('should return 404 for non-existent release', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      const response = await authenticatedRequest(app, authToken)
        .get(`/api/releases/${fakeId}`)
        .expect(404);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('PATCH /api/releases/:id', () => {
    it('should update release name and description', async () => {
      const releaseData = releaseFixtures.withName('Original Name');

      const createResponse = await authenticatedRequest(app, authToken)
        .post('/api/releases')
        .send(releaseData)
        .expect(201);

      const release = createResponse.body;

      const updateData = {
        name: 'Updated Name',
        description: 'Updated description',
      };

      const response = await authenticatedRequest(app, authToken)
        .patch(`/api/releases/${release.id}`)
        .send(updateData)
        .expect(200);

      // Verify fields were updated
      expect(response.body.name).toBe(updateData.name);
      expect(response.body.description).toBe(updateData.description);
      expect(response.body.id).toBe(release.id);

      // Verify updated_at changed
      expect(response.body.updated_at).not.toBe(release.updated_at);
    });

    it('should return 404 when updating non-existent release', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await authenticatedRequest(app, authToken)
        .patch(`/api/releases/${fakeId}`)
        .send({ name: 'New Name' })
        .expect(404);
    });
  });

  describe('DELETE /api/releases/:id', () => {
    it('should delete a regular release', async () => {
      // CRITICAL: Ensure Unassigned release exists (required for delete operation)
      await ensureUnassignedRelease();

      const releaseData = releaseFixtures.withName('Release to Delete');

      const createResponse = await authenticatedRequest(app, authToken)
        .post('/api/releases')
        .send(releaseData)
        .expect(201);

      const release = createResponse.body;

      // Delete the release
      const deleteResponse = await authenticatedRequest(app, authToken)
        .delete(`/api/releases/${release.id}`)
        .expect(200);

      // Verify response structure
      expect(deleteResponse.body).toMatchObject({
        success: true,
        stories_moved: expect.any(Number),
      });

      // Verify release is gone
      await authenticatedRequest(app, authToken)
        .get(`/api/releases/${release.id}`)
        .expect(404);
    });

    it('should return 404 when deleting non-existent release', async () => {
      // CRITICAL: Ensure Unassigned release exists (required for delete operation)
      await ensureUnassignedRelease();

      const fakeId = '00000000-0000-0000-0000-000000000000';

      await authenticatedRequest(app, authToken)
        .delete(`/api/releases/${fakeId}`)
        .expect(404);
    });

    it('should prevent deletion of Unassigned release', async () => {
      // CRITICAL: Ensure Unassigned release exists
      const unassigned = await ensureUnassignedRelease();

      // Try to delete the Unassigned release
      const response = await authenticatedRequest(app, authToken)
        .delete(`/api/releases/${unassigned.id}`)
        .expect(400);

      // Verify error message indicates protection
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toMatch(/unassigned|cannot.*delete/i);

      // Verify Unassigned release still exists
      await authenticatedRequest(app, authToken)
        .get(`/api/releases/${unassigned.id}`)
        .expect(200);
    });

    // Note: Cascade behavior (moving stories to Unassigned on release delete)
    // will be tested in Tier 2 complex operations tests. For Tier 1, we focus
    // on basic CRUD operations.
  });
});
