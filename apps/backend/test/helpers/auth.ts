import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { generateUniqueEmail } from './unique';

/**
 * Creates a test user and returns their auth token
 * Uses Supabase Admin SDK to bypass rate limits
 *
 * @param _app - NestJS application instance (unused, kept for compatibility)
 * @param email - Optional custom email (defaults to unique generated email)
 * @param password - Optional custom password (defaults to Test1234!)
 * @returns Promise<string> - JWT access token
 */
export async function createAuthToken(
  _app: INestApplication,
  email?: string,
  password: string = 'Test1234!',
): Promise<string> {
  const userEmail = email || generateUniqueEmail();

  // Create admin client using service role key (bypasses rate limits)
  const supabaseAdmin = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );

  // Create user via admin SDK (bypasses rate limits and auto-confirms email)
  const { error: createError } = await supabaseAdmin.auth.admin.createUser({
    email: userEmail,
    password: password,
    email_confirm: true, // Auto-confirm email (skip verification)
  });

  if (createError) {
    throw new Error(`Failed to create test user: ${createError.message}`);
  }

  // Sign in to get session token
  const { data: signInData, error: signInError } =
    await supabaseAdmin.auth.signInWithPassword({
      email: userEmail,
      password: password,
    });

  if (signInError || !signInData.session) {
    throw new Error(`Failed to sign in test user: ${signInError?.message}`);
  }

  return signInData.session.access_token;
}

/**
 * Creates an authenticated supertest request with Bearer token
 *
 * @param app - NestJS application instance
 * @param token - JWT access token
 * @returns Supertest request with Authorization header
 *
 * @example
 * const response = await authenticatedRequest(app, token)
 *   .get('/api/journeys')
 *   .expect(200);
 */
export function authenticatedRequest(
  app: INestApplication,
  token: string,
) {
  return request(app.getHttpServer()).set('Authorization', `Bearer ${token}`);
}

/**
 * Creates a test user with specific credentials
 * Returns both token and user details
 * Uses Supabase Admin SDK to bypass rate limits
 *
 * @param _app - NestJS application instance (unused, kept for compatibility)
 * @param email - User email
 * @param password - User password
 * @returns Promise<{ token: string; user: any }> - Auth token and user object
 */
export async function createTestUser(
  _app: INestApplication,
  email?: string,
  password: string = 'Test1234!',
): Promise<{ token: string; user: any }> {
  const userEmail = email || generateUniqueEmail();

  // Create admin client using service role key (bypasses rate limits)
  const supabaseAdmin = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );

  // Create user via admin SDK
  const { data: createData, error: createError } =
    await supabaseAdmin.auth.admin.createUser({
      email: userEmail,
      password: password,
      email_confirm: true,
    });

  if (createError || !createData.user) {
    throw new Error(`Failed to create test user: ${createError?.message}`);
  }

  // Sign in to get session token
  const { data: signInData, error: signInError } =
    await supabaseAdmin.auth.signInWithPassword({
      email: userEmail,
      password: password,
    });

  if (signInError || !signInData.session) {
    throw new Error(`Failed to sign in test user: ${signInError?.message}`);
  }

  return {
    token: signInData.session.access_token,
    user: createData.user,
  };
}
