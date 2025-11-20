import { generateUniqueName } from '../helpers/unique';

/**
 * Story fixtures for testing
 */
export const storyFixtures = {
  /**
   * Minimal valid story (step_id and release_id must be provided)
   */
  minimal: (stepId: string, releaseId: string) => ({
    title: generateUniqueName('Story'),
    step_id: stepId,
    release_id: releaseId,
  }),

  /**
   * Story with custom title
   */
  withTitle: (stepId: string, releaseId: string, title: string) => ({
    title,
    step_id: stepId,
    release_id: releaseId,
  }),

  /**
   * Complete story with all fields
   */
  complete: (stepId: string, releaseId: string) => ({
    title: generateUniqueName('Story'),
    description: 'As a user, I want to test stories',
    status: 'IN_PROGRESS',
    step_id: stepId,
    release_id: releaseId,
  }),

  /**
   * Story with specific status
   */
  withStatus: (stepId: string, releaseId: string, status: string) => ({
    title: generateUniqueName('Story'),
    description: '',
    status,
    step_id: stepId,
    release_id: releaseId,
  }),

  /**
   * Story with empty title (for validation testing)
   */
  invalidEmpty: (stepId: string, releaseId: string) => ({
    title: '',
    step_id: stepId,
    release_id: releaseId,
  }),

  /**
   * Story with invalid step_id (for FK constraint testing)
   */
  invalidStepId: (releaseId: string) => ({
    title: generateUniqueName('Story'),
    step_id: 'non-existent-step-id',
    release_id: releaseId,
  }),

  /**
   * Story with invalid release_id (for FK constraint testing)
   */
  invalidReleaseId: (stepId: string) => ({
    title: generateUniqueName('Story'),
    step_id: stepId,
    release_id: 'non-existent-release-id',
  }),
};
