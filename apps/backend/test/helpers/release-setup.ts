/**
 * Release setup helpers for E2E tests
 *
 * Provides utility functions for setting up releases in test scenarios,
 * particularly for the special "Unassigned" release that cannot be created via API
 */

import { PrismaClient } from '@prisma/client';

/**
 * Prisma client instance
 * Using lazy initialization to ensure DATABASE_URL is set by worker routing
 * before the client is created
 */
let prisma: PrismaClient | null = null;

/**
 * Gets or creates the Prisma client
 * CRITICAL: Uses lazy initialization to ensure DATABASE_URL is set by
 * worker-based routing in setup.ts BEFORE the client is instantiated
 *
 * @returns PrismaClient instance
 */
function getPrismaClient(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient({
      datasourceUrl: process.env.DATABASE_URL,
    });
  }
  return prisma;
}

/**
 * Ensure the Unassigned release exists in the database
 *
 * The Unassigned release is a special release that:
 * - Cannot be created via the API (enforced in service layer)
 * - Cannot be deleted (business rule)
 * - Is required for delete operations (stories are moved here)
 *
 * This helper creates it directly via Prisma for testing purposes
 *
 * @returns The Unassigned release object
 */
export async function ensureUnassignedRelease() {
  const client = getPrismaClient();
  // Check if Unassigned release already exists
  const existing = await client.release.findFirst({
    where: { isUnassigned: true },
  });

  if (existing) {
    return existing;
  }

  // Create Unassigned release directly via Prisma (bypassing API validation)
  return await client.release.create({
    data: {
      name: 'Unassigned',
      description: 'Default release for unassigned stories',
      isUnassigned: true,
      sortOrder: -1, // Put at the top (before normal releases which start at 0)
      shipped: false,
      createdBy: 'system',
    },
  });
}
