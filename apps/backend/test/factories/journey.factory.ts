import { INestApplication } from '@nestjs/common';
import { authenticatedRequest } from '../helpers/auth';
import { journeyFixtures } from '../fixtures/journey.fixture';

/**
 * Creates a journey via HTTP POST
 *
 * @param app - NestJS application instance
 * @param token - JWT auth token
 * @param storyMapId - Story map ID (workspace scoping)
 * @param name - Optional custom name (defaults to unique generated name)
 * @returns Promise<any> - Created journey object
 */
export async function createJourney(
  app: INestApplication,
  token: string,
  storyMapId: string,
  name?: string,
): Promise<any> {
  const data = name
    ? journeyFixtures.withName(storyMapId, name)
    : journeyFixtures.minimal(storyMapId);

  const response = await authenticatedRequest(app, token)
    .post('/api/journeys')
    .send(data)
    .expect(201);

  return response.body;
}

/**
 * Creates multiple journeys in sequence
 *
 * @param app - NestJS application instance
 * @param token - JWT auth token
 * @param storyMapId - Story map ID (workspace scoping)
 * @param count - Number of journeys to create
 * @returns Promise<any[]> - Array of created journey objects
 */
export async function createJourneys(
  app: INestApplication,
  token: string,
  storyMapId: string,
  count: number,
): Promise<any[]> {
  const journeys = [];

  for (let i = 0; i < count; i++) {
    const journey = await createJourney(app, token, storyMapId);
    journeys.push(journey);
  }

  return journeys;
}
