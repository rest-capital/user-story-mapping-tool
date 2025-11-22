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
 * Forces recreation of Prisma client
 * Called by setup.ts after DATABASE_URL is overridden for worker isolation
 *
 * @returns void
 */
export function recreatePrismaClient(): void {
  if (prisma) {
    // Disconnect existing client
    prisma.$disconnect().catch(() => {
      // Ignore disconnect errors during recreation
    });
  }
  // Force new client creation on next getPrismaClient() call
  prisma = null;
}

/**
 * Resets the entire test database
 * Deletes all records in reverse dependency order (critical!)
 *
 * IMPORTANT: This is called before EACH test to ensure isolation
 *
 * NOTE: Each StoryMap automatically gets its own Unassigned release when created,
 * so we don't need to create a global one here anymore.
 *
 * @returns Promise<void>
 */
export async function resetDatabase(): Promise<void> {
  const client = getPrismaClient();
  // Delete in reverse dependency order to avoid foreign key errors
  // Children first, parents last
  await client.comment.deleteMany();
  await client.storyLink.deleteMany(); // Story dependencies
  await client.story.deleteMany();
  await client.step.deleteMany();
  await client.release.deleteMany();
  await client.journey.deleteMany();
  await client.tag.deleteMany();
  await client.persona.deleteMany();
  await client.storyMap.deleteMany(); // StoryMaps are parents of releases
}

/**
 * Disconnects from the test database
 * Should be called in afterAll hook
 *
 * @returns Promise<void>
 */
export async function disconnectDatabase(): Promise<void> {
  const client = getPrismaClient();
  await client.$disconnect();
  prisma = null; // Clear reference for cleanup
}

/**
 * Verifies that the database is completely empty
 * Used for cleanup verification in CI/CD
 *
 * @returns Promise<void>
 * @throws Error if database contains any records
 */
export async function assertDatabaseIsEmpty(): Promise<void> {
  const client = getPrismaClient();
  const counts = await Promise.all([
    client.storyMap.count(),
    client.journey.count(),
    client.step.count(),
    client.release.count(),
    client.story.count(),
    client.comment.count(),
    client.tag.count(),
    client.persona.count(),
    client.storyLink.count(),
  ]);

  const total = counts.reduce((sum, count) => sum + count, 0);

  if (total > 0) {
    const details = [
      `StoryMaps: ${counts[0]}`,
      `Journeys: ${counts[1]}`,
      `Steps: ${counts[2]}`,
      `Releases: ${counts[3]}`,
      `Stories: ${counts[4]}`,
      `Comments: ${counts[5]}`,
      `Tags: ${counts[6]}`,
      `Personas: ${counts[7]}`,
      `StoryLinks: ${counts[8]}`,
    ].join(', ');

    throw new Error(`❌ Database not empty! Found ${total} records (${details})`);
  }
}
