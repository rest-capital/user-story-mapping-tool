/**
 * Domain-specific error for Collaboration module operations
 */
export class CollaborationError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error,
    public readonly context?: Record<string, any>,
  ) {
    super(message);
    this.name = 'CollaborationError';
    Error.captureStackTrace(this, this.constructor);
  }
}
