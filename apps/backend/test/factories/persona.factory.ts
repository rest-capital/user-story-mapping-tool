import { INestApplication } from '@nestjs/common';
import { authenticatedRequest } from '../helpers/auth';
import { personaFixtures } from '../fixtures/persona.fixture';

/**
 * Creates a persona via HTTP POST
 *
 * @param app - NestJS application instance
 * @param token - JWT auth token
 * @param storyMapId - Story map ID (workspace scoping)
 * @param name - Optional custom name (defaults to unique generated name)
 * @param description - Optional description
 * @returns Promise<any> - Created persona object
 */
export async function createPersona(
  app: INestApplication,
  token: string,
  storyMapId: string,
  name?: string,
  description?: string,
): Promise<any> {
  const data = name
    ? personaFixtures.withName(storyMapId, name)
    : personaFixtures.minimal(storyMapId);

  if (description !== undefined) {
    data.description = description;
  }

  const response = await authenticatedRequest(app, token)
    .post('/api/personas')
    .send(data)
    .expect(201);

  return response.body;
}

/**
 * Creates multiple personas in sequence
 *
 * @param app - NestJS application instance
 * @param token - JWT auth token
 * @param storyMapId - Story map ID (workspace scoping)
 * @param count - Number of personas to create
 * @returns Promise<any[]> - Array of created persona objects
 */
export async function createPersonas(
  app: INestApplication,
  token: string,
  storyMapId: string,
  count: number,
): Promise<any[]> {
  const personas = [];

  for (let i = 0; i < count; i++) {
    const persona = await createPersona(app, token, storyMapId, `Persona ${i + 1}`);
    personas.push(persona);
  }

  return personas;
}

/**
 * Creates common persona presets (Admin, End User, Power User)
 *
 * @param app - NestJS application instance
 * @param token - JWT auth token
 * @param storyMapId - Story map ID (workspace scoping)
 * @returns Promise<object> - Object with named persona references
 */
export async function createCommonPersonas(
  app: INestApplication,
  token: string,
  storyMapId: string,
): Promise<{
  admin: any;
  endUser: any;
  powerUser: any;
}> {
  const [admin, endUser, powerUser] = await Promise.all([
    createPersona(app, token, storyMapId, 'Admin User', 'System administrator with full access'),
    createPersona(app, token, storyMapId, 'End User', 'Regular user of the application'),
    createPersona(app, token, storyMapId, 'Power User', 'Advanced user with extended capabilities'),
  ]);

  return { admin, endUser, powerUser };
}
