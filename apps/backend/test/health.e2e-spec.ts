/**
 * Health Check E2E Tests
 *
 * Simple smoke test to verify test infrastructure is working
 * This is the first test to run to ensure:
 * - Test app initialization works
 * - HTTP requests work
 * - Database cleanup works
 * - Fixtures and factories are accessible
 */

import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './helpers/test-app';
import { createAuthToken } from './helpers/auth';

describe('Health (E2E) - Smoke Test', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/health', () => {
    it('should return 200 OK', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/health')
        .expect(200);

      // Verify response structure
      expect(response.body).toBeDefined();
    });
  });

  describe('Infrastructure Smoke Tests', () => {
    it('should create test app successfully', async () => {
      expect(app).toBeDefined();
      expect(app.getHttpServer()).toBeDefined();
    });

    it('should create auth token successfully', async () => {
      // This tests:
      // - Auth helper works
      // - Unique email generation works
      // - HTTP requests work
      // - Supabase Auth integration works
      const token = await createAuthToken(app);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    });

    it('should make authenticated requests successfully', async () => {
      const token = await createAuthToken(app);

      const response = await request(app.getHttpServer())
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Profile endpoint returns user object directly (not wrapped)
      expect(response.body).toBeDefined();
      expect(response.body.id).toBeDefined();
      expect(response.body.email).toBeDefined();
    });
  });
});
