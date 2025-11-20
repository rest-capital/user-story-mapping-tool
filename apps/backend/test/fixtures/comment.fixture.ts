/**
 * Comment fixtures for testing
 */
export const commentFixtures = {
  /**
   * Minimal valid comment (story_id must be provided)
   * Note: author info comes from JWT, not request body
   */
  minimal: (storyId: string) => ({
    content: 'This is a test comment',
    story_id: storyId,
  }),

  /**
   * Comment with custom content
   */
  withContent: (storyId: string, content: string) => ({
    content,
    story_id: storyId,
  }),

  /**
   * Long comment
   */
  long: (storyId: string) => ({
    content: 'This is a very long comment that contains a lot of text to test how the system handles longer content. '.repeat(5),
    story_id: storyId,
  }),

  /**
   * Comment with empty content (for validation testing)
   */
  invalidEmpty: (storyId: string) => ({
    content: '',
    story_id: storyId,
  }),

  /**
   * Comment with markdown
   */
  withMarkdown: (storyId: string) => ({
    content: '## Heading\n\nThis is **bold** and *italic* text.\n\n- List item 1\n- List item 2',
    story_id: storyId,
  }),
};
