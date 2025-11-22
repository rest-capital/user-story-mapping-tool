import { INestApplication } from '@nestjs/common';
import { authenticatedRequest } from '../helpers/auth';
import { storyMapFixtures } from '../fixtures/story-map.fixture';

/**
 * Creates a story map via HTTP POST
 *
 * @param app - NestJS application instance
 * @param token - JWT auth token
 * @param name - Optional custom name (defaults to unique generated name)
 * @returns Promise<any> - Created story map object
 */
export async function createStoryMap(
  app: INestApplication,
  token: string,
  name?: string,
): Promise<any> {
  const data = name
    ? storyMapFixtures.withName(name)
    : storyMapFixtures.minimal();

  const response = await authenticatedRequest(app, token)
    .post('/api/story-maps')
    .send(data)
    .expect(201);

  return response.body;
}

/**
 * Gets the first story map from the list
 * Useful for tests that need a default story map
 *
 * @param app - NestJS application instance
 * @param token - JWT auth token
 * @returns Promise<any> - First story map object or undefined if none exist
 */
export async function getDefaultStoryMap(
  app: INestApplication,
  token: string,
): Promise<any> {
  const response = await authenticatedRequest(app, token)
    .get('/api/story-maps')
    .expect(200);

  const storyMaps = response.body;
  return storyMaps.length > 0 ? storyMaps[0] : undefined;
}

/**
 * Creates multiple story maps in sequence
 *
 * @param app - NestJS application instance
 * @param token - JWT auth token
 * @param count - Number of story maps to create
 * @returns Promise<any[]> - Array of created story map objects
 */
export async function createStoryMaps(
  app: INestApplication,
  token: string,
  count: number,
): Promise<any[]> {
  const storyMaps = [];

  for (let i = 0; i < count; i++) {
    const storyMap = await createStoryMap(app, token);
    storyMaps.push(storyMap);
  }

  return storyMaps;
}
