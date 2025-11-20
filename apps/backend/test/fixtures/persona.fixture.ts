import { generateUniqueName } from '../helpers/unique';

/**
 * Persona fixtures for testing
 */
export const personaFixtures = {
  /**
   * Minimal valid persona
   */
  minimal: () => ({
    name: generateUniqueName('Persona'),
    description: '',
  }),

  /**
   * Persona with custom name
   */
  withName: (name: string) => ({
    name,
    description: '',
  }),

  /**
   * Persona with description
   */
  withDescription: (description: string) => ({
    name: generateUniqueName('Persona'),
    description,
  }),

  /**
   * Complete persona with name and description
   */
  complete: () => ({
    name: generateUniqueName('Persona'),
    description: 'A detailed persona description',
  }),

  /**
   * Persona with empty name (for validation testing)
   */
  invalidEmpty: () => ({
    name: '',
    description: '',
  }),

  /**
   * Common persona presets
   */
  presets: {
    admin: () => ({
      name: 'Admin User',
      description: 'System administrator with full access',
    }),
    endUser: () => ({
      name: 'End User',
      description: 'Regular user of the application',
    }),
    powerUser: () => ({
      name: 'Power User',
      description: 'Advanced user with extended capabilities',
    }),
  },
};
