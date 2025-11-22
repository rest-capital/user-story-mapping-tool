import { generateUniqueName } from '../helpers/unique';

/**
 * Persona fixtures for testing
 */
export const personaFixtures = {
  /**
   * Minimal valid persona
   */
  minimal: (storyMapId: string) => ({
    story_map_id: storyMapId,
    name: generateUniqueName('Persona'),
    description: '',
  }),

  /**
   * Persona with custom name
   */
  withName: (storyMapId: string, name: string) => ({
    story_map_id: storyMapId,
    name,
    description: '',
  }),

  /**
   * Persona with description
   */
  withDescription: (storyMapId: string, description: string) => ({
    story_map_id: storyMapId,
    name: generateUniqueName('Persona'),
    description,
  }),

  /**
   * Complete persona with name and description
   */
  complete: (storyMapId: string) => ({
    story_map_id: storyMapId,
    name: generateUniqueName('Persona'),
    description: 'A detailed persona description',
  }),

  /**
   * Persona with empty name (for validation testing)
   */
  invalidEmpty: (storyMapId: string) => ({
    story_map_id: storyMapId,
    name: '',
    description: '',
  }),

  /**
   * Common persona presets
   */
  presets: {
    admin: (storyMapId: string) => ({
      story_map_id: storyMapId,
      name: 'Admin User',
      description: 'System administrator with full access',
    }),
    endUser: (storyMapId: string) => ({
      story_map_id: storyMapId,
      name: 'End User',
      description: 'Regular user of the application',
    }),
    powerUser: (storyMapId: string) => ({
      story_map_id: storyMapId,
      name: 'Power User',
      description: 'Advanced user with extended capabilities',
    }),
  },
};
