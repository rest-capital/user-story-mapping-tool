/**
 * Domain-specific error for Persona module operations
 */
export class PersonaError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error,
    public readonly context?: Record<string, any>,
  ) {
    super(message);
    this.name = 'PersonaError';
    Error.captureStackTrace(this, this.constructor);
  }
}
