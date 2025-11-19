/**
 * Domain error for Journey operations
 */
export class JourneyError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error,
    public readonly context?: Record<string, any>,
  ) {
    super(message);
    this.name = 'JourneyError';
    Error.captureStackTrace(this, this.constructor);
  }
}
