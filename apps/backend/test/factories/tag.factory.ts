import { INestApplication } from '@nestjs/common';
import { authenticatedRequest } from '../helpers/auth';
import { tagFixtures } from '../fixtures/tag.fixture';

/**
 * Creates a tag via HTTP POST
 *
 * @param app - NestJS application instance
 * @param token - JWT auth token
 * @param storyMapId - Story map ID (workspace scoping)
 * @param name - Optional custom name (defaults to unique generated name)
 * @returns Promise<any> - Created tag object
 */
export async function createTag(
  app: INestApplication,
  token: string,
  storyMapId: string,
  name?: string,
): Promise<any> {
  const data = name
    ? tagFixtures.withName(storyMapId, name)
    : tagFixtures.minimal(storyMapId);

  const response = await authenticatedRequest(app, token)
    .post('/api/tags')
    .send(data)
    .expect(201);

  return response.body;
}

/**
 * Creates multiple tags in sequence
 *
 * @param app - NestJS application instance
 * @param token - JWT auth token
 * @param storyMapId - Story map ID (workspace scoping)
 * @param count - Number of tags to create
 * @returns Promise<any[]> - Array of created tag objects
 */
export async function createTags(
  app: INestApplication,
  token: string,
  storyMapId: string,
  count: number,
): Promise<any[]> {
  const tags = [];

  for (let i = 0; i < count; i++) {
    const tag = await createTag(app, token, storyMapId, `Tag ${i + 1}`);
    tags.push(tag);
  }

  return tags;
}

/**
 * Creates common tag presets (Frontend, Backend, Bug, Feature)
 *
 * @param app - NestJS application instance
 * @param token - JWT auth token
 * @param storyMapId - Story map ID (workspace scoping)
 * @returns Promise<object> - Object with named tag references
 */
export async function createCommonTags(
  app: INestApplication,
  token: string,
  storyMapId: string,
): Promise<{
  frontend: any;
  backend: any;
  bug: any;
  feature: any;
}> {
  const [frontend, backend, bug, feature] = await Promise.all([
    createTag(app, token, storyMapId, 'Frontend'),
    createTag(app, token, storyMapId, 'Backend'),
    createTag(app, token, storyMapId, 'Bug'),
    createTag(app, token, storyMapId, 'Feature'),
  ]);

  return { frontend, backend, bug, feature };
}
