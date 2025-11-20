import { INestApplication } from '@nestjs/common';
import { authenticatedRequest } from '../helpers/auth';
import { storyFixtures } from '../fixtures/story.fixture';

/**
 * Creates a story via HTTP POST
 *
 * @param app - NestJS application instance
 * @param token - JWT auth token
 * @param stepId - Parent step ID
 * @param releaseId - Parent release ID
 * @param overrides - Optional field overrides
 * @returns Promise<any> - Created story object
 */
export async function createStory(
  app: INestApplication,
  token: string,
  stepId: string,
  releaseId: string,
  overrides?: Partial<any>,
): Promise<any> {
  const data = {
    ...storyFixtures.minimal(stepId, releaseId),
    ...overrides,
  };

  const response = await authenticatedRequest(app, token)
    .post('/api/stories')
    .send(data)
    .expect(201);

  return response.body;
}

/**
 * Creates multiple stories in a cell (step + release) in sequence
 *
 * @param app - NestJS application instance
 * @param token - JWT auth token
 * @param stepId - Parent step ID
 * @param releaseId - Parent release ID
 * @param count - Number of stories to create
 * @returns Promise<any[]> - Array of created story objects
 */
export async function createStories(
  app: INestApplication,
  token: string,
  stepId: string,
  releaseId: string,
  count: number,
): Promise<any[]> {
  const stories = [];

  for (let i = 0; i < count; i++) {
    const story = await createStory(app, token, stepId, releaseId, {
      title: `Story ${i + 1}`,
    });
    stories.push(story);
  }

  return stories;
}

/**
 * Creates a story with dependencies
 *
 * @param app - NestJS application instance
 * @param token - JWT auth token
 * @param stepId - Parent step ID
 * @param releaseId - Parent release ID
 * @param targetStoryIds - Array of story IDs this story depends on
 * @returns Promise<any> - Created story object with dependencies
 */
export async function createStoryWithDependencies(
  app: INestApplication,
  token: string,
  stepId: string,
  releaseId: string,
  targetStoryIds: string[],
): Promise<any> {
  // Create the story first
  const story = await createStory(app, token, stepId, releaseId);

  // Add dependencies
  for (const targetId of targetStoryIds) {
    await authenticatedRequest(app, token)
      .post(`/api/stories/${story.id}/dependencies`)
      .send({
        target_story_id: targetId,
        relationship_type: 'blocked_by',
      })
      .expect(201);
  }

  return story;
}
