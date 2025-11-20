import { generateUniqueName } from '../helpers/unique';

/**
 * Tag fixtures for testing
 */
export const tagFixtures = {
  /**
   * Minimal valid tag
   */
  minimal: () => ({
    name: generateUniqueName('Tag'),
    color: '#3B82F6',
  }),

  /**
   * Tag with custom name
   */
  withName: (name: string) => ({
    name,
    color: '#3B82F6',
  }),

  /**
   * Tag with custom color
   */
  withColor: (color: string) => ({
    name: generateUniqueName('Tag'),
    color,
  }),

  /**
   * Complete tag with name and color
   */
  complete: (name: string, color: string) => ({
    name,
    color,
  }),

  /**
   * Tag with empty name (for validation testing)
   */
  invalidEmpty: () => ({
    name: '',
    color: '#3B82F6',
  }),

  /**
   * Common tag presets
   */
  presets: {
    frontend: () => ({
      name: 'Frontend',
      color: '#3B82F6',
    }),
    backend: () => ({
      name: 'Backend',
      color: '#10B981',
    }),
    bug: () => ({
      name: 'Bug',
      color: '#EF4444',
    }),
    feature: () => ({
      name: 'Feature',
      color: '#8B5CF6',
    }),
  },
};
