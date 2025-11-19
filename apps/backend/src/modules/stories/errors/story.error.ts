/**
 * Domain-specific error for Story module operations
 */
export class StoryError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error,
    public readonly context?: Record<string, any>,
  ) {
    super(message);
    this.name = 'StoryError';
    Error.captureStackTrace(this, this.constructor);
  }
}
