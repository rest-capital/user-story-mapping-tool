/**
 * Counters for generating unique test data
 * Prevents collisions across tests
 */
let emailCounter = 0;
let nameCounter = 0;

/**
 * Generates a unique email address for testing
 * Uses timestamp and counter to ensure uniqueness
 *
 * @returns string - Unique email address
 *
 * @example
 * const email = generateUniqueEmail();
 * // Returns: "test-1732047600123-0@example.com"
 */
export function generateUniqueEmail(): string {
  return `test-${Date.now()}-${emailCounter++}@example.com`;
}

/**
 * Generates a unique name with a prefix
 * Uses timestamp and counter to ensure uniqueness
 *
 * @param prefix - Prefix for the name (e.g., "Journey", "Story")
 * @returns string - Unique name
 *
 * @example
 * const name = generateUniqueName('Journey');
 * // Returns: "Journey-1732047600123-0"
 */
export function generateUniqueName(prefix: string): string {
  return `${prefix}-${Date.now()}-${nameCounter++}`;
}

/**
 * Resets counters (useful for deterministic testing)
 * Generally not needed as timestamps provide uniqueness
 */
export function resetCounters(): void {
  emailCounter = 0;
  nameCounter = 0;
}
