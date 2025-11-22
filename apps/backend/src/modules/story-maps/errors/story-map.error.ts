export class StoryMapError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error,
    public readonly context?: Record<string, any>,
  ) {
    super(message);
    this.name = 'StoryMapError';
    Error.captureStackTrace(this, this.constructor);
  }
}
