/**
 * Domain error class for Comment operations
 */
export class CommentError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error,
    public readonly context?: Record<string, any>,
  ) {
    super(message);
    this.name = 'CommentError';
    Error.captureStackTrace(this, this.constructor);
  }
}
