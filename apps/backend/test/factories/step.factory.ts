import { INestApplication } from '@nestjs/common';
import { authenticatedRequest } from '../helpers/auth';
import { stepFixtures } from '../fixtures/step.fixture';

/**
 * Creates a step via HTTP POST
 *
 * @param app - NestJS application instance
 * @param token - JWT auth token
 * @param journeyId - Parent journey ID
 * @param name - Optional custom name (defaults to unique generated name)
 * @returns Promise<any> - Created step object
 */
export async function createStep(
  app: INestApplication,
  token: string,
  journeyId: string,
  name?: string,
): Promise<any> {
  const data = name
    ? stepFixtures.withName(journeyId, name)
    : stepFixtures.minimal(journeyId);

  const response = await authenticatedRequest(app, token)
    .post('/api/steps')
    .send(data)
    .expect(201);

  return response.body;
}

/**
 * Creates multiple steps for a journey in sequence
 *
 * @param app - NestJS application instance
 * @param token - JWT auth token
 * @param journeyId - Parent journey ID
 * @param count - Number of steps to create
 * @returns Promise<any[]> - Array of created step objects
 */
export async function createSteps(
  app: INestApplication,
  token: string,
  journeyId: string,
  count: number,
): Promise<any[]> {
  const steps = [];

  for (let i = 0; i < count; i++) {
    const step = await createStep(app, token, journeyId, `Step ${i + 1}`);
    steps.push(step);
  }

  return steps;
}
