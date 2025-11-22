import { generateUniqueName } from '../helpers/unique';

/**
 * Journey fixtures for testing
 */
export const journeyFixtures = {
  /**
   * Minimal valid journey
   */
  minimal: (storyMapId: string) => ({
    story_map_id: storyMapId,
    name: generateUniqueName('Journey'),
  }),

  /**
   * Journey with custom name
   */
  withName: (storyMapId: string, name: string) => ({
    story_map_id: storyMapId,
    name,
  }),

  /**
   * Journey with empty name (for validation testing)
   */
  invalidEmpty: (storyMapId: string) => ({
    story_map_id: storyMapId,
    name: '',
  }),

  /**
   * Journey with very long name
   */
  longName: (storyMapId: string) => ({
    story_map_id: storyMapId,
    name: 'A'.repeat(300),
  }),
};
