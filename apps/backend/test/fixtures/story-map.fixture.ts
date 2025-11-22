import { generateUniqueName } from '../helpers/unique';

/**
 * StoryMap fixtures for testing
 */
export const storyMapFixtures = {
  /**
   * Minimal valid story map
   */
  minimal: () => ({
    name: generateUniqueName('Story Map'),
  }),

  /**
   * Story map with custom name
   */
  withName: (name: string) => ({
    name,
  }),

  /**
   * Story map with description
   */
  withDescription: (name: string, description: string) => ({
    name,
    description,
  }),

  /**
   * Story map with empty name (for validation testing)
   */
  invalidEmpty: () => ({
    name: '',
  }),

  /**
   * Story map with very long name
   */
  longName: () => ({
    name: 'A'.repeat(300),
  }),
};
