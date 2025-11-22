import { generateUniqueName } from '../helpers/unique';

/**
 * Tag fixtures for testing
 */
export const tagFixtures = {
  /**
   * Minimal valid tag
   */
  minimal: (storyMapId: string) => ({
    story_map_id: storyMapId,
    name: generateUniqueName('Tag'),
  }),

  /**
   * Tag with custom name
   */
  withName: (storyMapId: string, name: string) => ({
    story_map_id: storyMapId,
    name,
  }),

  /**
   * Tag with empty name (for validation testing)
   */
  invalidEmpty: (storyMapId: string) => ({
    story_map_id: storyMapId,
    name: '',
  }),

  /**
   * Common tag presets
   */
  presets: {
    frontend: (storyMapId: string) => ({
      story_map_id: storyMapId,
      name: 'Frontend',
    }),
    backend: (storyMapId: string) => ({
      story_map_id: storyMapId,
      name: 'Backend',
    }),
    bug: (storyMapId: string) => ({
      story_map_id: storyMapId,
      name: 'Bug',
    }),
    feature: (storyMapId: string) => ({
      story_map_id: storyMapId,
      name: 'Feature',
    }),
  },
};
