export class StepError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error,
    public readonly context?: Record<string, any>,
  ) {
    super(message);
    this.name = 'StepError';
    Error.captureStackTrace(this, this.constructor);
  }
}
