/**
 * Domain-specific error for Tag module operations
 */
export class TagError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error,
    public readonly context?: Record<string, any>,
  ) {
    super(message);
    this.name = 'TagError';
    Error.captureStackTrace(this, this.constructor);
  }
}
