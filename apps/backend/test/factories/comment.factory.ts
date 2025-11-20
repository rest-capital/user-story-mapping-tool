import { INestApplication } from '@nestjs/common';
import { authenticatedRequest } from '../helpers/auth';
import { commentFixtures } from '../fixtures/comment.fixture';

/**
 * Creates a comment via HTTP POST
 *
 * @param app - NestJS application instance
 * @param token - JWT auth token
 * @param storyId - Parent story ID
 * @param content - Optional custom content (defaults to "This is a test comment")
 * @returns Promise<any> - Created comment object
 */
export async function createComment(
  app: INestApplication,
  token: string,
  storyId: string,
  content?: string,
): Promise<any> {
  const data = content
    ? commentFixtures.withContent(storyId, content)
    : commentFixtures.minimal(storyId);

  const response = await authenticatedRequest(app, token)
    .post(`/api/stories/${storyId}/comments`)
    .send({ content: data.content }) // Only send content (author from JWT)
    .expect(201);

  return response.body;
}

/**
 * Creates multiple comments for a story in sequence
 *
 * @param app - NestJS application instance
 * @param token - JWT auth token
 * @param storyId - Parent story ID
 * @param count - Number of comments to create
 * @returns Promise<any[]> - Array of created comment objects
 */
export async function createComments(
  app: INestApplication,
  token: string,
  storyId: string,
  count: number,
): Promise<any[]> {
  const comments = [];

  for (let i = 0; i < count; i++) {
    const comment = await createComment(app, token, storyId, `Comment ${i + 1}`);
    comments.push(comment);
  }

  return comments;
}
