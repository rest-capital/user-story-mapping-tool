import { INestApplication } from '@nestjs/common';
import { authenticatedRequest } from '../helpers/auth';
import { tagFixtures } from '../fixtures/tag.fixture';

/**
 * Creates a tag via HTTP POST
 *
 * @param app - NestJS application instance
 * @param token - JWT auth token
 * @param name - Optional custom name (defaults to unique generated name)
 * @param color - Optional custom color (defaults to blue)
 * @returns Promise<any> - Created tag object
 */
export async function createTag(
  app: INestApplication,
  token: string,
  name?: string,
  color?: string,
): Promise<any> {
  const data = name
    ? tagFixtures.withName(name)
    : tagFixtures.minimal();

  if (color !== undefined) {
    data.color = color;
  }

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
 * @param count - Number of tags to create
 * @returns Promise<any[]> - Array of created tag objects
 */
export async function createTags(
  app: INestApplication,
  token: string,
  count: number,
): Promise<any[]> {
  const tags = [];

  for (let i = 0; i < count; i++) {
    const tag = await createTag(app, token, `Tag ${i + 1}`);
    tags.push(tag);
  }

  return tags;
}

/**
 * Creates common tag presets (Frontend, Backend, Bug, Feature)
 *
 * @param app - NestJS application instance
 * @param token - JWT auth token
 * @returns Promise<object> - Object with named tag references
 */
export async function createCommonTags(
  app: INestApplication,
  token: string,
): Promise<{
  frontend: any;
  backend: any;
  bug: any;
  feature: any;
}> {
  const [frontend, backend, bug, feature] = await Promise.all([
    createTag(app, token, 'Frontend', '#3B82F6'),
    createTag(app, token, 'Backend', '#10B981'),
    createTag(app, token, 'Bug', '#EF4444'),
    createTag(app, token, 'Feature', '#8B5CF6'),
  ]);

  return { frontend, backend, bug, feature };
}
