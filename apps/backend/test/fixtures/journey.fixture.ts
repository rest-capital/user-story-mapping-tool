import { generateUniqueName } from '../helpers/unique';

/**
 * Journey fixtures for testing
 */
export const journeyFixtures = {
  /**
   * Minimal valid journey
   */
  minimal: () => ({
    name: generateUniqueName('Journey'),
  }),

  /**
   * Journey with custom name
   */
  withName: (name: string) => ({
    name,
  }),

  /**
   * Journey with empty name (for validation testing)
   */
  invalidEmpty: () => ({
    name: '',
  }),

  /**
   * Journey with very long name
   */
  longName: () => ({
    name: 'A'.repeat(300),
  }),
};
