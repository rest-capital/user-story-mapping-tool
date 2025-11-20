/**
 * Global test setup for E2E tests - PARALLEL EXECUTION
 *
 * This file is executed once per worker before tests (configured in jest-e2e.json)
 *
 * PARALLEL ARCHITECTURE:
 * - 4 workers run simultaneously (maxWorkers: 4)
 * - Each worker has its own isolated database (test_db_1, test_db_2, test_db_3, test_db_4)
 * - Worker ID determines which database to use
 * - Tests within each worker run sequentially
 * - Database is wiped before each test in that worker
 *
 * This file sets up:
 * - Worker-specific database routing via JEST_WORKER_ID
 * - Environment variables from .env.test
 * - Global beforeEach hooks for database cleanup
 * - Global afterAll hooks for disconnection
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { resetDatabase, disconnectDatabase, recreatePrismaClient } from './helpers/database';
import { deleteAllTestUsers } from './helpers/auth-cleanup';

// Load test environment variables
dotenv.config({ path: path.join(__dirname, '../.env.test') });

/**
 * Get worker-specific database name
 * Jest assigns JEST_WORKER_ID as '1', '2', '3', '4' for parallel workers
 * We route each worker to its own database for complete isolation
 */
const getWorkerDatabaseName = (): string => {
  const workerId = process.env.JEST_WORKER_ID || '1';
  return `test_db_${workerId}`;
};

/**
 * Override DATABASE_URL and DIRECT_URL to use worker-specific database
 * This ensures each worker has complete database isolation
 */
const dbName = getWorkerDatabaseName();
const baseUrl = 'postgresql://postgres:postgres@localhost:54322';
process.env.DATABASE_URL = `${baseUrl}/${dbName}`;
process.env.DIRECT_URL = `${baseUrl}/${dbName}`;

console.log(`[Worker ${process.env.JEST_WORKER_ID || '1'}] Using database: ${dbName}`);

/**
 * CRITICAL: Force Prisma client recreation after DATABASE_URL override
 * This ensures the Prisma client uses the worker-specific database URL
 * instead of the default URL from .env.test
 */
recreatePrismaClient();

/**
 * Global beforeEach hook
 * Cleans database and auth users before EACH test
 *
 * CRITICAL: Clean before (not after) to ensure test isolation
 * even when tests fail or timeout
 *
 * ⚠️  AUTH ISOLATION LIMITATION IN PARALLEL MODE:
 * Database isolation is PERFECT (each worker has its own DB).
 * Auth isolation is IMPERFECT (all workers share same Supabase Auth).
 *
 * This means auth users may leak between workers. Mitigation:
 * - Clean auth before each test (reduces but doesn't eliminate races)
 * - Use unique email addresses per test (UUID or timestamp-based)
 * - Auth-heavy tests may have slight flakiness in parallel mode
 */
beforeEach(async () => {
  try {
    // Clean database tables (Prisma) - PERFECT isolation per worker
    await resetDatabase();

    // Clean Supabase Auth users (they persist beyond Prisma) - SHARED across workers
    await deleteAllTestUsers();
  } catch (error) {
    console.error('Setup failed in beforeEach:', error);
    throw error;
  }
}, 30000); // 30 second timeout for cleanup

/**
 * Global afterAll hook
 * Disconnects from database after all tests complete
 */
afterAll(async () => {
  try {
    await disconnectDatabase();
  } catch (error) {
    console.error('Teardown failed in afterAll:', error);
    throw error;
  }
}, 10000); // 10 second timeout for disconnection
