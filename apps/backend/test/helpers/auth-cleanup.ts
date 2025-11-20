import { createClient } from '@supabase/supabase-js';

/**
 * Lazy-initialized Supabase admin client
 * Created on first use to ensure env vars are loaded
 */
let supabaseAdmin: ReturnType<typeof createClient> | null = null;

/**
 * Gets or creates the Supabase admin client
 * Uses lazy initialization to ensure env vars are loaded
 */
function getSupabaseAdmin(): ReturnType<typeof createClient> | null {
  // Return existing client if already initialized
  if (supabaseAdmin) {
    return supabaseAdmin;
  }

  // Check if SERVICE_ROLE_KEY is available
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }

  // Create client on first use
  supabaseAdmin = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );

  return supabaseAdmin;
}

/**
 * Deletes all test users from Supabase Auth
 *
 * CRITICAL: Supabase Auth users persist even after database reset
 * This function must be called to clean up auth users
 *
 * ⚠️  PARALLEL TESTING LIMITATION:
 * When running tests in parallel with multiple workers, ALL workers share
 * the SAME Supabase Auth instance (auth is at project level, not database level).
 * This means:
 * - Auth users created in Worker 1 are visible to Worker 2, 3, 4
 * - deleteAllTestUsers() in Worker 1 may delete users from Worker 2's tests
 * - Potential race conditions and test flakiness
 *
 * MITIGATION STRATEGIES:
 * 1. Use unique email patterns per test (e.g., `test-${Date.now()}-${Math.random()}@test.com`)
 * 2. Clean auth users BEFORE each test (current approach)
 * 3. Accept that auth-heavy tests may be slightly flaky in parallel mode
 * 4. For critical auth tests, consider running them serially (separate Jest config)
 *
 * @returns Promise<void>
 */
export async function deleteAllTestUsers(): Promise<void> {
  const admin = getSupabaseAdmin();

  if (!admin) {
    console.warn('⚠️  Supabase admin client not initialized (SERVICE_ROLE_KEY missing)');
    console.warn('   Auth users will not be cleaned up between tests');
    console.warn('   Add SUPABASE_SERVICE_ROLE_KEY to .env.test for full cleanup');
    return;
  }

  try {
    // List all users
    const { data: { users }, error: listError } = await admin.auth.admin.listUsers();

    if (listError) {
      console.warn('Warning: Could not list users for cleanup:', listError.message);
      return;
    }

    // Delete each user
    for (const user of users) {
      const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);

      if (deleteError) {
        console.warn(`Warning: Could not delete user ${user.id}:`, deleteError.message);
      }
    }
  } catch (error: any) {
    console.warn('Warning: Auth cleanup failed:', error.message);
    // Don't throw - allow tests to continue even if auth cleanup fails
  }
}

/**
 * Deletes a specific test user by ID
 *
 * @param userId - Supabase user ID to delete
 * @returns Promise<void>
 */
export async function deleteTestUser(userId: string): Promise<void> {
  const admin = getSupabaseAdmin();

  if (!admin) {
    console.warn('⚠️  Cannot delete user: Supabase admin client not initialized');
    return;
  }

  try {
    const { error } = await admin.auth.admin.deleteUser(userId);

    if (error) {
      console.warn(`Warning: Could not delete user ${userId}:`, error.message);
    }
  } catch (error: any) {
    console.warn('Warning: Auth cleanup failed:', error.message);
  }
}
