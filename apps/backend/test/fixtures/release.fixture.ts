import { generateUniqueName } from '../helpers/unique';

/**
 * Release fixtures for testing
 */
export const releaseFixtures = {
  /**
   * Minimal valid release
   */
  minimal: (storyMapId: string) => ({
    story_map_id: storyMapId,
    name: generateUniqueName('Release'),
    description: '',
  }),

  /**
   * Release with custom name
   */
  withName: (storyMapId: string, name: string) => ({
    story_map_id: storyMapId,
    name,
    description: '',
  }),

  /**
   * Release with description
   */
  withDescription: (storyMapId: string, description: string) => ({
    story_map_id: storyMapId,
    name: generateUniqueName('Release'),
    description,
  }),

  /**
   * Complete release with name and description
   */
  complete: (storyMapId: string) => ({
    story_map_id: storyMapId,
    name: generateUniqueName('Release'),
    description: 'A complete release with full details',
  }),

  /**
   * Release with empty name (for validation testing)
   */
  invalidEmpty: (storyMapId: string) => ({
    story_map_id: storyMapId,
    name: '',
    description: '',
  }),

  /**
   * Unassigned release (special case)
   */
  unassigned: (storyMapId: string) => ({
    story_map_id: storyMapId,
    name: 'Unassigned',
    description: 'Default release for unassigned stories',
    is_unassigned: true,
  }),
};
