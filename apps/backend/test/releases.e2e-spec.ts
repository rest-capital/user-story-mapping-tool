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
import { createStoryMap } from './factories';

describe('Releases (E2E) - Tier 1', () => {
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

  describe('POST /api/releases', () => {
    it('should create a release with valid data', async () => {
      const releaseData = releaseFixtures.minimal(storyMap.id);

      const response = await authenticatedRequest(app, authToken)
        .post('/api/releases')
        .send(releaseData)
        .expect(201);

      // Verify response structure
      expect(response.body).toMatchObject({
        id: expect.any(String),
        story_map_id: storyMap.id,
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
      const releaseData = releaseFixtures.minimal(storyMap.id);

      await request(app.getHttpServer())
        .post('/api/releases')
        .send(releaseData)
        .expect(401);
    });

    it('should reject invalid data (empty name)', async () => {
      const invalidData = releaseFixtures.invalidEmpty(storyMap.id);

      const response = await authenticatedRequest(app, authToken)
        .post('/api/releases')
        .send(invalidData)
        .expect(400);

      // Verify error message
      expect(response.body).toHaveProperty('message');
    });

    it('should auto-calculate sort_order correctly (0-based increment)', async () => {
      // Note: Unassigned release already exists with sortOrder=0
      // When counting existing releases: count=1, so first custom release gets sortOrder=1
      // But the service uses 0-based indexing where sortOrder = count
      // This means: count(Unassigned)=1 → sortOrder=1 for first custom release
      // However, if database is clean, first release gets 0

      // Create a fresh story map for this test to ensure clean state
      const testMap = await createStoryMap(app, authToken);

      // Get the Unassigned release's sort order
      const existingReleases = await authenticatedRequest(app, authToken)
        .get(`/api/releases?story_map_id=${testMap.id}`)
        .expect(200);

      const unassignedSortOrder = existingReleases.body[0].sort_order;
      expect(unassignedSortOrder).toBe(0); // Unassigned should be 0
      expect(existingReleases.body.length).toBe(1); // Only Unassigned exists

      // Create 3 releases and verify sort_order increments
      const release1 = await authenticatedRequest(app, authToken)
        .post('/api/releases')
        .send(releaseFixtures.minimal(testMap.id))
        .expect(201);

      const release2 = await authenticatedRequest(app, authToken)
        .post('/api/releases')
        .send(releaseFixtures.minimal(testMap.id))
        .expect(201);

      const release3 = await authenticatedRequest(app, authToken)
        .post('/api/releases')
        .send(releaseFixtures.minimal(testMap.id))
        .expect(201);

      // Verify sort_order increments (count-based: 1, 2, 3 because Unassigned exists)
      expect(release1.body.sort_order).toBe(1);
      expect(release2.body.sort_order).toBe(2);
      expect(release3.body.sort_order).toBe(3);
    });

    it('should create release with optional fields (dates, shipped)', async () => {
      const releaseData = {
        story_map_id: storyMap.id,
        name: 'Q1 Release',
        description: 'First quarter release',
        start_date: '2024-01-01T00:00:00.000Z',
        due_date: '2024-03-31T23:59:59.999Z',
        shipped: false,
      };

      const response = await authenticatedRequest(app, authToken)
        .post('/api/releases')
        .send(releaseData)
        .expect(201);

      expect(response.body).toMatchObject({
        id: expect.any(String),
        story_map_id: storyMap.id,
        name: 'Q1 Release',
        description: 'First quarter release',
        start_date: '2024-01-01T00:00:00.000Z',
        due_date: '2024-03-31T23:59:59.999Z',
        shipped: false,
        is_unassigned: false,
      });
    });
  });

  describe('GET /api/releases', () => {
    it('should list all releases sorted by sort_order', async () => {
      // Create multiple releases
      const release1Data = releaseFixtures.withName(storyMap.id, 'Release 1');
      const release2Data = releaseFixtures.withName(storyMap.id, 'Release 2');
      const release3Data = releaseFixtures.withName(storyMap.id, 'Release 3');

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
        .get(`/api/releases?story_map_id=${storyMap.id}`)
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
        .get(`/api/releases?story_map_id=${storyMap.id}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(1); // Only Unassigned release
      expect(response.body[0].is_unassigned).toBe(true);
      expect(response.body[0].name).toBe('Unassigned');
    });

    it('should only return releases for the specified story map (workspace isolation)', async () => {
      // Create a second story map
      const storyMap2 = await createStoryMap(app, authToken);

      // Create releases in both story maps
      const release1 = await authenticatedRequest(app, authToken)
        .post('/api/releases')
        .send(releaseFixtures.withName(storyMap.id, 'Release in Map 1'))
        .expect(201);

      const release2 = await authenticatedRequest(app, authToken)
        .post('/api/releases')
        .send(releaseFixtures.withName(storyMap2.id, 'Release in Map 2'))
        .expect(201);

      // Get releases for first story map
      const response1 = await authenticatedRequest(app, authToken)
        .get(`/api/releases?story_map_id=${storyMap.id}`)
        .expect(200);

      // Should only include releases from first story map
      const releaseIds1 = response1.body.map((r: any) => r.id);
      expect(releaseIds1).toContain(release1.body.id);
      expect(releaseIds1).not.toContain(release2.body.id);

      // Get releases for second story map
      const response2 = await authenticatedRequest(app, authToken)
        .get(`/api/releases?story_map_id=${storyMap2.id}`)
        .expect(200);

      // Should only include releases from second story map
      const releaseIds2 = response2.body.map((r: any) => r.id);
      expect(releaseIds2).toContain(release2.body.id);
      expect(releaseIds2).not.toContain(release1.body.id);
    });
  });

  describe('GET /api/releases/:id', () => {
    it('should get a single release by ID', async () => {
      const releaseData = releaseFixtures.withName(storyMap.id, 'Test Release');

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
      const releaseData = releaseFixtures.withName(storyMap.id, 'Original Name');

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

    it('should update dates and shipped status', async () => {
      const releaseData = releaseFixtures.withName(storyMap.id, 'Q2 Release');

      const createResponse = await authenticatedRequest(app, authToken)
        .post('/api/releases')
        .send(releaseData)
        .expect(201);

      const release = createResponse.body;

      // Update dates and shipped status
      const updateData = {
        start_date: '2024-04-01T00:00:00.000Z',
        due_date: '2024-06-30T23:59:59.999Z',
        shipped: true,
      };

      const response = await authenticatedRequest(app, authToken)
        .patch(`/api/releases/${release.id}`)
        .send(updateData)
        .expect(200);

      // Verify fields were updated
      expect(response.body.start_date).toBe(updateData.start_date);
      expect(response.body.due_date).toBe(updateData.due_date);
      expect(response.body.shipped).toBe(true);
      expect(response.body.id).toBe(release.id);
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
      await ensureUnassignedRelease(storyMap.id);

      const releaseData = releaseFixtures.withName(storyMap.id, 'Release to Delete');

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
      await ensureUnassignedRelease(storyMap.id);

      const fakeId = '00000000-0000-0000-0000-000000000000';

      await authenticatedRequest(app, authToken)
        .delete(`/api/releases/${fakeId}`)
        .expect(404);
    });

    it('should prevent deletion of Unassigned release', async () => {
      // CRITICAL: Ensure Unassigned release exists
      const unassigned = await ensureUnassignedRelease(storyMap.id);

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
