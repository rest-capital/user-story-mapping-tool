import { generateUniqueName } from '../helpers/unique';

/**
 * Step fixtures for testing
 */
export const stepFixtures = {
  /**
   * Minimal valid step (journey_id must be provided by test)
   */
  minimal: (journeyId: string) => ({
    name: generateUniqueName('Step'),
    journey_id: journeyId,
  }),

  /**
   * Step with custom name
   */
  withName: (journeyId: string, name: string) => ({
    name,
    journey_id: journeyId,
  }),

  /**
   * Step with invalid journey_id (for FK constraint testing)
   */
  invalidJourneyId: () => ({
    name: generateUniqueName('Step'),
    journey_id: 'non-existent-id',
  }),

  /**
   * Step with empty name (for validation testing)
   */
  invalidEmpty: (journeyId: string) => ({
    name: '',
    journey_id: journeyId,
  }),
};
