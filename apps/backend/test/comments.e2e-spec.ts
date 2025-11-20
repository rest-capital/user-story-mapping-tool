/**
 * Comments E2E Tests (Tier 1)
 *
 * Tests basic CRUD operations for Comments:
 * - Create comment (author info from JWT)
 * - List comments for story (with is_current_user flag)
 * - Update comment (author only)
 * - Delete comment (author only)
 * - Error handling (401, 404, 403)
 *
 * CRITICAL: Comments require parent Story (which requires Step + Release)
 * CRITICAL: Author info extracted from JWT (not in request body)
 * CRITICAL: Response includes is_current_user flag
 *
 * Following patterns from journeys.e2e-spec.ts and E2E_TESTING_STRATEGY.md
 * REFACTORED: Using factory pattern for parent entity creation
 */

import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './helpers/test-app';
import { createAuthToken, authenticatedRequest } from './helpers/auth';
import { createJourney, createStep, createRelease, createStory } from './factories';

describe('Comments (E2E) - Tier 1', () => {
  let app: INestApplication;
  let authToken: string;

  // Parent entities required for comments
  let storyId: string;

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    // Auth token is created fresh for each test
    // Database cleanup happens in global setup.ts
    authToken = await createAuthToken(app);

    // CRITICAL: Create parent entities required for comments using factories
    // Comments require: story_id (Journey > Step > Story <- Release)
    const journey = await createJourney(app, authToken);
    const step = await createStep(app, authToken, journey.id, 'Test Step');
    const release = await createRelease(app, authToken);
    const story = await createStory(app, authToken, step.id, release.id, {
      title: 'Test Story for Comments',
    });

    storyId = story.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/stories/:storyId/comments', () => {
    it('should create a comment with author info from JWT', async () => {
      // Frontend sends ONLY content
      const commentData = {
        content: 'This is a test comment',
      };

      const response = await authenticatedRequest(app, authToken)
        .post(`/api/stories/${storyId}/comments`)
        .send(commentData)
        .expect(201);

      // Verify response structure
      expect(response.body).toMatchObject({
        id: expect.any(String),
        content: commentData.content,
        story_id: storyId,
        author_id: expect.any(String),
        author: expect.any(String),
        is_current_user: true, // Always true for creator
        created_at: expect.any(String),
        updated_at: expect.any(String),
      });
    });

    it('should reject unauthenticated requests', async () => {
      const commentData = {
        content: 'This is a test comment',
      };

      await request(app.getHttpServer())
        .post(`/api/stories/${storyId}/comments`)
        .send(commentData)
        .expect(401);
    });

    it('should reject invalid data (empty content)', async () => {
      const invalidData = {
        content: '',
      };

      const response = await authenticatedRequest(app, authToken)
        .post(`/api/stories/${storyId}/comments`)
        .send(invalidData)
        .expect(400);

      // Verify error message
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('GET /api/stories/:storyId/comments', () => {
    it('should list comments for story with is_current_user flag', async () => {
      // Create comment
      const commentData = {
        content: 'First comment',
      };

      await authenticatedRequest(app, authToken)
        .post(`/api/stories/${storyId}/comments`)
        .send(commentData)
        .expect(201);

      // Get comments
      const response = await authenticatedRequest(app, authToken)
        .get(`/api/stories/${storyId}/comments`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(1);

      // Verify is_current_user flag
      expect(response.body[0]).toMatchObject({
        content: 'First comment',
        is_current_user: true, // Current user created this comment
      });
    });

    it('should return empty array when no comments exist', async () => {
      const response = await authenticatedRequest(app, authToken)
        .get(`/api/stories/${storyId}/comments`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(0);
    });
  });

  describe('PATCH /api/comments/:id', () => {
    it('should update comment content', async () => {
      // Create comment
      const commentData = {
        content: 'Original content',
      };

      const createResponse = await authenticatedRequest(app, authToken)
        .post(`/api/stories/${storyId}/comments`)
        .send(commentData)
        .expect(201);

      const comment = createResponse.body;

      // Update comment
      const updateData = {
        content: 'Updated content',
      };

      const response = await authenticatedRequest(app, authToken)
        .patch(`/api/comments/${comment.id}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toMatchObject({
        id: comment.id,
        content: 'Updated content',
        is_current_user: true,
      });
    });

    it('should return 404 when updating non-existent comment', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await authenticatedRequest(app, authToken)
        .patch(`/api/comments/${fakeId}`)
        .send({ content: 'Updated' })
        .expect(404);
    });
  });

  describe('DELETE /api/comments/:id', () => {
    it('should delete a comment', async () => {
      // Create comment
      const commentData = {
        content: 'Comment to delete',
      };

      const createResponse = await authenticatedRequest(app, authToken)
        .post(`/api/stories/${storyId}/comments`)
        .send(commentData)
        .expect(201);

      const comment = createResponse.body;

      // Delete comment
      const deleteResponse = await authenticatedRequest(app, authToken)
        .delete(`/api/comments/${comment.id}`)
        .expect(200);

      // Verify response structure
      expect(deleteResponse.body).toMatchObject({
        success: true,
      });

      // Verify comment is gone (list should be empty)
      const listResponse = await authenticatedRequest(app, authToken)
        .get(`/api/stories/${storyId}/comments`)
        .expect(200);

      expect(listResponse.body).toHaveLength(0);
    });

    it('should return 404 when deleting non-existent comment', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await authenticatedRequest(app, authToken)
        .delete(`/api/comments/${fakeId}`)
        .expect(404);
    });

    // Note: Author-only permissions will be tested in Tier 2 complex operations tests.
    // For Tier 1, we focus on basic CRUD operations with same user.
  });
});
