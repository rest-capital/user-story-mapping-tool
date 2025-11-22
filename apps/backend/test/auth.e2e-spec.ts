/**
 * Authentication E2E Tests
 *
 * Tests Supabase Auth integration:
 * - Signup with validation
 * - Login with credentials
 * - Profile retrieval with JWT
 * - Logout functionality
 * - Auth guard enforcement
 *
 * These tests validate the entire auth flow from signup to logout.
 */

import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './helpers/test-app';
import { generateUniqueEmail } from './helpers/unique';
import { userFixtures } from './fixtures/user.fixture';

describe('Authentication (E2E)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/auth/signup', () => {
    it('should create a new user account with valid data', async () => {
      const userData = userFixtures.default();

      const response = await request(app.getHttpServer())
        .post('/api/auth/signup')
        .send(userData)
        .expect(201);

      // Verify response structure
      expect(response.body).toMatchObject({
        access_token: expect.any(String),
        refresh_token: expect.any(String),
        user: expect.objectContaining({
          id: expect.any(String),
          email: userData.email,
        }),
      });

      // Verify tokens are non-empty
      expect(response.body.access_token.length).toBeGreaterThan(0);
      expect(response.body.refresh_token.length).toBeGreaterThan(0);
    });

    it('should reject duplicate email', async () => {
      const userData = userFixtures.default();

      // Create user first time
      await request(app.getHttpServer())
        .post('/api/auth/signup')
        .send(userData)
        .expect(201);

      // Try to create same user again
      const response = await request(app.getHttpServer())
        .post('/api/auth/signup')
        .send(userData)
        .expect(400);

      // Verify error response
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toMatch(/already registered|already exists/i);
    });

    it('should validate password requirements', async () => {
      const weakPasswordUser = {
        email: generateUniqueEmail(),
        password: 'weak',
      };

      const response = await request(app.getHttpServer())
        .post('/api/auth/signup')
        .send(weakPasswordUser)
        .expect(400);

      // Verify validation error (message may be array or string)
      expect(response.body).toHaveProperty('message');
      const message = Array.isArray(response.body.message)
        ? response.body.message.join(' ')
        : response.body.message;
      expect(message).toMatch(/password|invalid/i);
    });

    it('should reject signup with missing email', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/signup')
        .send({ password: 'Test1234!' })
        .expect(400);

      expect(response.body).toHaveProperty('message');
    });

    it('should reject signup with missing password', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/signup')
        .send({ email: generateUniqueEmail() })
        .expect(400);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      // Create user first
      const userData = userFixtures.default();
      await request(app.getHttpServer())
        .post('/api/auth/signup')
        .send(userData)
        .expect(201);

      // Login with same credentials
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: userData.password,
        })
        .expect(201);

      // Verify response structure
      expect(response.body).toMatchObject({
        access_token: expect.any(String),
        refresh_token: expect.any(String),
        user: expect.objectContaining({
          email: userData.email,
        }),
      });
    });

    it('should reject invalid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: generateUniqueEmail(),
          password: 'WrongPassword123!',
        })
        .expect(401);

      // Verify error response
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toMatch(/invalid|credentials|unauthorized/i);
    });

    it('should reject login with wrong password', async () => {
      // Create user
      const userData = userFixtures.default();
      await request(app.getHttpServer())
        .post('/api/auth/signup')
        .send(userData)
        .expect(201);

      // Try to login with wrong password
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: 'WrongPassword123!',
        })
        .expect(401);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('GET /api/auth/profile', () => {
    it('should get authenticated user profile', async () => {
      // Create and login user
      const userData = userFixtures.default();
      const signupResponse = await request(app.getHttpServer())
        .post('/api/auth/signup')
        .send(userData)
        .expect(201);

      const token = signupResponse.body.access_token;

      // Get profile
      const response = await request(app.getHttpServer())
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Verify profile data (API returns user object directly)
      expect(response.body).toMatchObject({
        id: expect.any(String),
        email: userData.email,
      });
    });

    it('should reject unauthenticated request', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/auth/profile')
        .expect(401);

      // Verify error response
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toMatch(/unauthorized|token|authentication/i);
    });

    it('should reject request with invalid token', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid-token-here')
        .expect(401);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout successfully', async () => {
      // Create and login user
      const userData = userFixtures.default();
      const signupResponse = await request(app.getHttpServer())
        .post('/api/auth/signup')
        .send(userData)
        .expect(201);

      const token = signupResponse.body.access_token;

      // Logout
      const response = await request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(201);

      // Verify logout response
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toMatch(/logged out|success/i);
    });

    it('should reject logout without authentication', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/logout')
        .expect(401);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('Auth Integration', () => {
    it('should enforce authentication on protected routes', async () => {
      // Try to access protected route without token
      const response = await request(app.getHttpServer())
        .get('/api/journeys')
        .expect(401);

      expect(response.body).toHaveProperty('message');
    });

    it('should allow access to protected routes with valid token', async () => {
      // Create user and get token
      const userData = userFixtures.default();
      const signupResponse = await request(app.getHttpServer())
        .post('/api/auth/signup')
        .send(userData)
        .expect(201);

      const token = signupResponse.body.access_token;

      // First create a story map (required for workspace scoping)
      const storyMapResponse = await request(app.getHttpServer())
        .post('/api/story-maps')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Test Story Map' })
        .expect(201);

      const storyMapId = storyMapResponse.body.id;

      // Access protected route with story_map_id
      const response = await request(app.getHttpServer())
        .get(`/api/journeys?story_map_id=${storyMapId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Should return empty array (no journeys yet)
      expect(Array.isArray(response.body)).toBe(true);
    });
  });
});
