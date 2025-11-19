export class StoryLinkError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error,
    public readonly context?: Record<string, any>,
  ) {
    super(message);
    this.name = 'StoryLinkError';
    Error.captureStackTrace(this, this.constructor);
  }
}
