/**
 * Journey Reordering E2E Tests (Tier 2)
 *
 * Tests complex reordering operations for Journeys:
 * - Reorder journey to position 0
 * - Reorder journey to middle position
 * - Reject negative sort_order
 * - Validate all journeys maintain unique sort_order
 *
 * Following patterns from E2E_TESTING_STRATEGY.md Tier 2
 * REFACTORED: Using factory pattern for entity creation
 */

import { INestApplication } from '@nestjs/common';
import { createTestApp } from './helpers/test-app';
import { createAuthToken, authenticatedRequest } from './helpers/auth';
import { createJourney } from './factories';

describe('Journeys Reordering (E2E) - Tier 2', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    authToken = await createAuthToken(app);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/journeys/:id/reorder', () => {
    it('should reorder journey to position 0 (first)', async () => {
      // Create 3 journeys using factories (positions 0, 1, 2)
      const journey1 = await createJourney(app, authToken, 'Journey 1');
      const journey2 = await createJourney(app, authToken, 'Journey 2');
      const journey3 = await createJourney(app, authToken, 'Journey 3');

      // Move journey3 to position 0
      await authenticatedRequest(app, authToken)
        .post(`/api/journeys/${journey3.id}/reorder`)
        .send({ new_sort_order: 0 })
        .expect(201); // TODO: Backend should return 200, not 201 for reorder

      // Verify new order
      const journeys = await authenticatedRequest(app, authToken)
        .get('/api/journeys')
        .expect(200)
        .then(res => res.body);

      // Should be ordered: journey3, journey1, journey2
      expect(journeys).toHaveLength(3);
      expect(journeys[0].id).toBe(journey3.id);
      expect(journeys[1].id).toBe(journey1.id);
      expect(journeys[2].id).toBe(journey2.id);

      // Verify sort_order is 0-based and sequential
      expect(journeys[0].sort_order).toBe(0);
      expect(journeys[1].sort_order).toBe(1);
      expect(journeys[2].sort_order).toBe(2);
    });

    it('should reorder journey to middle position', async () => {
      // Create 4 journeys using factories
      const journey1 = await createJourney(app, authToken, 'Journey 1');
      const journey2 = await createJourney(app, authToken, 'Journey 2');
      const journey3 = await createJourney(app, authToken, 'Journey 3');
      const journey4 = await createJourney(app, authToken, 'Journey 4');

      // Move journey4 to position 1 (between journey1 and journey2)
      await authenticatedRequest(app, authToken)
        .post(`/api/journeys/${journey4.id}/reorder`)
        .send({ new_sort_order: 1 })
        .expect(201); // TODO: Backend should return 200, not 201 for reorder

      // Verify new order
      const journeys = await authenticatedRequest(app, authToken)
        .get('/api/journeys')
        .expect(200)
        .then(res => res.body);

      // Should be: journey1, journey4, journey2, journey3
      expect(journeys).toHaveLength(4);
      expect(journeys[0].id).toBe(journey1.id);
      expect(journeys[1].id).toBe(journey4.id);
      expect(journeys[2].id).toBe(journey2.id);
      expect(journeys[3].id).toBe(journey3.id);
    });

    it('should reject negative sort_order', async () => {
      const journey = await createJourney(app, authToken);

      // Try to reorder with negative sort_order
      await authenticatedRequest(app, authToken)
        .post(`/api/journeys/${journey.id}/reorder`)
        .send({ new_sort_order: -1 })
        .expect(400);
    });

    it('should maintain unique sort_order after multiple reorders', async () => {
      // Create 5 journeys using factories
      const journeys = [];
      for (let i = 1; i <= 5; i++) {
        const journey = await createJourney(app, authToken, `Journey ${i}`);
        journeys.push(journey);
      }

      // Perform multiple reorders
      // Move journey 5 to position 0
      await authenticatedRequest(app, authToken)
        .post(`/api/journeys/${journeys[4].id}/reorder`)
        .send({ new_sort_order: 0 })
        .expect(201); // TODO: Backend should return 200, not 201 for reorder

      // Move journey 1 to position 3
      await authenticatedRequest(app, authToken)
        .post(`/api/journeys/${journeys[0].id}/reorder`)
        .send({ new_sort_order: 3 })
        .expect(201); // TODO: Backend should return 200, not 201 for reorder

      // Fetch all journeys
      const result = await authenticatedRequest(app, authToken)
        .get('/api/journeys')
        .expect(200)
        .then(res => res.body);

      // Verify all sort_orders are unique and sequential (0-based)
      const sortOrders = result.map((j: any) => j.sort_order);
      const uniqueSortOrders = new Set(sortOrders);

      expect(uniqueSortOrders.size).toBe(sortOrders.length); // All unique
      expect(Math.min(...sortOrders)).toBe(0); // Starts at 0
      expect(Math.max(...sortOrders)).toBe(sortOrders.length - 1); // Ends at length-1
    });
  });
});
