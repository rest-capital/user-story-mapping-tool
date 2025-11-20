import { INestApplication } from '@nestjs/common';
import { authenticatedRequest } from '../helpers/auth';
import { releaseFixtures } from '../fixtures/release.fixture';

/**
 * Creates a release via HTTP POST
 *
 * @param app - NestJS application instance
 * @param token - JWT auth token
 * @param name - Optional custom name (defaults to unique generated name)
 * @param description - Optional description
 * @returns Promise<any> - Created release object
 */
export async function createRelease(
  app: INestApplication,
  token: string,
  name?: string,
  description?: string,
): Promise<any> {
  const data = name
    ? releaseFixtures.withName(name)
    : releaseFixtures.minimal();

  if (description !== undefined) {
    data.description = description;
  }

  const response = await authenticatedRequest(app, token)
    .post('/api/releases')
    .send(data)
    .expect(201);

  return response.body;
}

/**
 * Creates multiple releases in sequence
 *
 * @param app - NestJS application instance
 * @param token - JWT auth token
 * @param count - Number of releases to create
 * @returns Promise<any[]> - Array of created release objects
 */
export async function createReleases(
  app: INestApplication,
  token: string,
  count: number,
): Promise<any[]> {
  const releases = [];

  for (let i = 0; i < count; i++) {
    const release = await createRelease(app, token, `Release ${i + 1}`);
    releases.push(release);
  }

  return releases;
}

/**
 * Gets the Unassigned release (created automatically)
 *
 * @param app - NestJS application instance
 * @param token - JWT auth token
 * @returns Promise<any> - Unassigned release object
 */
export async function getUnassignedRelease(
  app: INestApplication,
  token: string,
): Promise<any> {
  const response = await authenticatedRequest(app, token)
    .get('/api/releases')
    .expect(200);

  const unassigned = response.body.find((r: any) => r.is_unassigned === true);

  if (!unassigned) {
    throw new Error('Unassigned release not found');
  }

  return unassigned;
}
