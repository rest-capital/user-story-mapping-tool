import { generateUniqueName } from '../helpers/unique';

/**
 * Release fixtures for testing
 */
export const releaseFixtures = {
  /**
   * Minimal valid release
   */
  minimal: () => ({
    name: generateUniqueName('Release'),
    description: '',
  }),

  /**
   * Release with custom name
   */
  withName: (name: string) => ({
    name,
    description: '',
  }),

  /**
   * Release with description
   */
  withDescription: (description: string) => ({
    name: generateUniqueName('Release'),
    description,
  }),

  /**
   * Complete release with name and description
   */
  complete: () => ({
    name: generateUniqueName('Release'),
    description: 'A complete release with full details',
  }),

  /**
   * Release with empty name (for validation testing)
   */
  invalidEmpty: () => ({
    name: '',
    description: '',
  }),

  /**
   * Unassigned release (special case)
   */
  unassigned: () => ({
    name: 'Unassigned',
    description: 'Default release for unassigned stories',
    is_unassigned: true,
  }),
};
