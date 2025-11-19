/**
 * Domain-specific error for Release module operations
 */
export class ReleaseError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error,
    public readonly context?: Record<string, any>,
  ) {
    super(message);
    this.name = 'ReleaseError';
    Error.captureStackTrace(this, this.constructor);
  }
}
