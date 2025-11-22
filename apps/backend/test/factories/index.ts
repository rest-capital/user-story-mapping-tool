/**
 * Central export for all test factories
 *
 * Factories create entities via HTTP calls (HOW to create)
 * They use fixtures for data (WHAT to create)
 */

// Entity factories
export {
  createStoryMap,
  createStoryMaps,
  getDefaultStoryMap,
} from './story-map.factory';
export { createJourney, createJourneys } from './journey.factory';
export { createStep, createSteps } from './step.factory';
export {
  createRelease,
  createReleases,
  getUnassignedRelease,
} from './release.factory';
export {
  createStory,
  createStories,
  createStoryWithDependencies,
} from './story.factory';
export { createTag, createTags, createCommonTags } from './tag.factory';
export {
  createPersona,
  createPersonas,
  createCommonPersonas,
} from './persona.factory';
export { createComment, createComments } from './comment.factory';
