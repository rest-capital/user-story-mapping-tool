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
import { createStoryMap, createJourney, createStep, createRelease, createStory } from './factories';

describe('Comments (E2E) - Tier 1', () => {
  let app: INestApplication;
  let authToken: string;
  let storyMap: any;

  // Parent entities required for comments
  let storyId: string;

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    // Auth token is created fresh for each test
    // Database cleanup happens in global setup.ts
    authToken = await createAuthToken(app);
    storyMap = await createStoryMap(app, authToken);

    // CRITICAL: Create parent entities required for comments using factories
    // Comments require: story_id (Journey > Step > Story <- Release)
    const journey = await createJourney(app, authToken, storyMap.id);
    const step = await createStep(app, authToken, journey.id, 'Test Step');
    const release = await createRelease(app, authToken, storyMap.id);
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

      // Verify error message format (NestJS class-validator returns array)
      expect(Array.isArray(response.body.message)).toBe(true);
      expect(response.body.message[0]).toMatch(/content should not be empty/i);
    });

    it('should reject invalid content type (non-string)', async () => {
      const invalidData = {
        content: 123, // Number instead of string
      };

      const response = await authenticatedRequest(app, authToken)
        .post(`/api/stories/${storyId}/comments`)
        .send(invalidData)
        .expect(400);

      // Verify error message mentions type validation
      expect(Array.isArray(response.body.message)).toBe(true);
      expect(response.body.message.some((msg: string) => msg.match(/content must be a string/i))).toBe(true);
    });

    it('should reject comment for non-existent story', async () => {
      const fakeStoryId = '00000000-0000-0000-0000-000000000000';
      const commentData = {
        content: 'Comment on non-existent story',
      };

      const response = await authenticatedRequest(app, authToken)
        .post(`/api/stories/${fakeStoryId}/comments`)
        .send(commentData)
        .expect(404);

      // Verify error message
      expect(response.body.message).toMatch(/story not found/i);
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

    it('should allow multiple comments on same story', async () => {
      // Create 3 comments
      const comment1 = { content: 'First comment' };
      const comment2 = { content: 'Second comment' };
      const comment3 = { content: 'Third comment' };

      await authenticatedRequest(app, authToken)
        .post(`/api/stories/${storyId}/comments`)
        .send(comment1)
        .expect(201);

      await authenticatedRequest(app, authToken)
        .post(`/api/stories/${storyId}/comments`)
        .send(comment2)
        .expect(201);

      await authenticatedRequest(app, authToken)
        .post(`/api/stories/${storyId}/comments`)
        .send(comment3)
        .expect(201);

      // Get all comments
      const response = await authenticatedRequest(app, authToken)
        .get(`/api/stories/${storyId}/comments`)
        .expect(200);

      expect(response.body).toHaveLength(3);
      expect(response.body.map((c: any) => c.content)).toEqual(
        expect.arrayContaining(['First comment', 'Second comment', 'Third comment']),
      );
    });

    it('should return comments ordered by created_at DESC (newest first)', async () => {
      // Create comments in sequence (with small delay to ensure different timestamps)
      const comment1 = { content: 'Oldest comment' };
      const comment2 = { content: 'Middle comment' };
      const comment3 = { content: 'Newest comment' };

      await authenticatedRequest(app, authToken)
        .post(`/api/stories/${storyId}/comments`)
        .send(comment1)
        .expect(201);

      // Small delay to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 10));

      await authenticatedRequest(app, authToken)
        .post(`/api/stories/${storyId}/comments`)
        .send(comment2)
        .expect(201);

      await new Promise((resolve) => setTimeout(resolve, 10));

      await authenticatedRequest(app, authToken)
        .post(`/api/stories/${storyId}/comments`)
        .send(comment3)
        .expect(201);

      // Get comments - should be ordered DESC (newest first)
      const response = await authenticatedRequest(app, authToken)
        .get(`/api/stories/${storyId}/comments`)
        .expect(200);

      expect(response.body).toHaveLength(3);
      // Verify order: newest first
      expect(response.body[0].content).toBe('Newest comment');
      expect(response.body[1].content).toBe('Middle comment');
      expect(response.body[2].content).toBe('Oldest comment');

      // Verify timestamps are descending
      const timestamp1 = new Date(response.body[0].created_at).getTime();
      const timestamp2 = new Date(response.body[1].created_at).getTime();
      const timestamp3 = new Date(response.body[2].created_at).getTime();
      expect(timestamp1).toBeGreaterThan(timestamp2);
      expect(timestamp2).toBeGreaterThan(timestamp3);
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

    it('should reject empty content on update', async () => {
      // Create comment
      const commentData = { content: 'Original content' };

      const createResponse = await authenticatedRequest(app, authToken)
        .post(`/api/stories/${storyId}/comments`)
        .send(commentData)
        .expect(201);

      const comment = createResponse.body;

      // Try to update with empty content
      const response = await authenticatedRequest(app, authToken)
        .patch(`/api/comments/${comment.id}`)
        .send({ content: '' })
        .expect(400);

      // Verify error message format
      expect(Array.isArray(response.body.message)).toBe(true);
      expect(response.body.message[0]).toMatch(/content should not be empty/i);
    });

    it('should reject invalid content type on update (non-string)', async () => {
      // Create comment
      const commentData = { content: 'Original content' };

      const createResponse = await authenticatedRequest(app, authToken)
        .post(`/api/stories/${storyId}/comments`)
        .send(commentData)
        .expect(201);

      const comment = createResponse.body;

      // Try to update with number instead of string
      const response = await authenticatedRequest(app, authToken)
        .patch(`/api/comments/${comment.id}`)
        .send({ content: 456 })
        .expect(400);

      // Verify error message mentions type validation
      expect(Array.isArray(response.body.message)).toBe(true);
      expect(response.body.message.some((msg: string) => msg.match(/content must be a string/i))).toBe(true);
    });

    it('should reject update by non-author (403 Forbidden)', async () => {
      // Create comment with first user
      const commentData = { content: 'Comment by user 1' };

      const createResponse = await authenticatedRequest(app, authToken)
        .post(`/api/stories/${storyId}/comments`)
        .send(commentData)
        .expect(201);

      const comment = createResponse.body;

      // Create second user token
      const secondUserToken = await createAuthToken(app);

      // Try to update with different user (should fail with 403)
      const response = await authenticatedRequest(app, secondUserToken)
        .patch(`/api/comments/${comment.id}`)
        .send({ content: 'Trying to update' })
        .expect(403);

      // Verify error message
      expect(response.body.message).toMatch(/you can only update your own comments/i);
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

    it('should reject delete by non-author (403 Forbidden)', async () => {
      // Create comment with first user
      const commentData = { content: 'Comment by user 1' };

      const createResponse = await authenticatedRequest(app, authToken)
        .post(`/api/stories/${storyId}/comments`)
        .send(commentData)
        .expect(201);

      const comment = createResponse.body;

      // Create second user token
      const secondUserToken = await createAuthToken(app);

      // Try to delete with different user (should fail with 403)
      const response = await authenticatedRequest(app, secondUserToken)
        .delete(`/api/comments/${comment.id}`)
        .expect(403);

      // Verify error message
      expect(response.body.message).toMatch(/you can only delete your own comments/i);

      // Verify comment still exists (delete was rejected)
      const listResponse = await authenticatedRequest(app, authToken)
        .get(`/api/stories/${storyId}/comments`)
        .expect(200);

      expect(listResponse.body).toHaveLength(1);
      expect(listResponse.body[0].id).toBe(comment.id);
    });
  });
});
