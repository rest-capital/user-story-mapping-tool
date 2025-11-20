import { INestApplication } from '@nestjs/common';
import { authenticatedRequest } from '../helpers/auth';
import { journeyFixtures } from '../fixtures/journey.fixture';

/**
 * Creates a journey via HTTP POST
 *
 * @param app - NestJS application instance
 * @param token - JWT auth token
 * @param name - Optional custom name (defaults to unique generated name)
 * @returns Promise<any> - Created journey object
 */
export async function createJourney(
  app: INestApplication,
  token: string,
  name?: string,
): Promise<any> {
  const data = name
    ? journeyFixtures.withName(name)
    : journeyFixtures.minimal();

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
 * @param count - Number of journeys to create
 * @returns Promise<any[]> - Array of created journey objects
 */
export async function createJourneys(
  app: INestApplication,
  token: string,
  count: number,
): Promise<any[]> {
  const journeys = [];

  for (let i = 0; i < count; i++) {
    const journey = await createJourney(app, token);
    journeys.push(journey);
  }

  return journeys;
}
