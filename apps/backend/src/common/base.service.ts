import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../modules/prisma/prisma.service';

/**
 * Base class for all services
 * Provides error handling, logging, and common utilities
 *
 * All services MUST extend this class to ensure consistent:
 * - Error handling (automatic Prisma error translation)
 * - Logging (structured operation logs)
 * - Transaction management (auto-rollback on error)
 * - Validation helpers (common patterns)
 */
@Injectable()
export abstract class BaseService {
  protected readonly logger: Logger;

  constructor(protected readonly prisma: PrismaService) {
    this.logger = new Logger(this.constructor.name);
  }

  /**
   * Must be implemented by child classes
   * Defines how to create domain-specific errors
   */
  protected abstract createDomainError(
    message: string,
    cause?: Error,
    context?: any,
  ): Error;

  /**
   * Execute operation with automatic error handling and logging
   *
   * Benefits:
   * - No manual try-catch needed
   * - Automatic Prisma error translation
   * - Structured logging
   * - Performance tracking
   *
   * @example
   * async getJourney(id: string) {
   *   return this.executeOperation(
   *     () => this.prisma.journey.findUnique({ where: { id } }),
   *     'getJourney',
   *     { journeyId: id }
   *   );
   * }
   */
  protected async executeOperation<T>(
    operation: () => Promise<T>,
    operationName: string,
    context?: Record<string, any>,
  ): Promise<T> {
    const startTime = Date.now();
    this.logger.debug(`Starting ${operationName}`, context);

    try {
      const result = await operation();
      const duration = Date.now() - startTime;
      this.logger.log(
        `${operationName} completed successfully in ${duration}ms`,
      );
      return result;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `${operationName} failed after ${duration}ms: ${error.message}`,
        error.stack,
      );

      // Translate Prisma errors to user-friendly messages
      if (error.code) {
        switch (error.code) {
          case 'P2002':
            // Unique constraint violation
            const field = error.meta?.target?.[0] || 'field';
            throw this.createDomainError(
              `A record with this ${field} already exists`,
              error,
              context,
            );

          case 'P2025':
            // Record not found
            throw this.createDomainError('Record not found', error, context);

          case 'P2003':
            // Foreign key constraint violation
            throw this.createDomainError(
              'Related record not found',
              error,
              context,
            );

          case 'P2014':
            // Required relation violation
            throw this.createDomainError(
              'Cannot delete record due to related records',
              error,
              context,
            );

          case 'P2021':
            // Table does not exist
            throw this.createDomainError(
              'Database table does not exist',
              error,
              context,
            );

          case 'P2024':
            // Connection timeout
            throw this.createDomainError(
              'Database connection timeout',
              error,
              context,
            );
        }
      }

      // Re-throw domain errors as-is (they're already user-friendly)
      if (error.name?.endsWith('Error') && error.message) {
        throw error;
      }

      // Wrap unknown errors
      throw this.createDomainError(
        'Operation failed unexpectedly',
        error,
        context,
      );
    }
  }

  /**
   * Execute operation in transaction with automatic rollback on error
   *
   * @example
   * async moveJourney(journeyId: string, newSortOrder: number) {
   *   return this.executeInTransaction(
   *     async (tx) => {
   *       const journey = await tx.journey.update({...});
   *       await tx.step.updateMany({...});
   *       return journey;
   *     },
   *     'moveJourney',
   *     { journeyId, newSortOrder }
   *   );
   * }
   */
  protected async executeInTransaction<T>(
    operation: (tx: any) => Promise<T>,
    operationName: string,
    context?: Record<string, any>,
  ): Promise<T> {
    const startTime = Date.now();
    this.logger.debug(`Starting transaction: ${operationName}`, context);

    try {
      const result = await this.prisma.$transaction(operation);
      const duration = Date.now() - startTime;
      this.logger.log(
        `Transaction ${operationName} completed in ${duration}ms`,
      );
      return result;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `Transaction ${operationName} failed after ${duration}ms (rolled back): ${error.message}`,
        error.stack,
      );

      // Prisma automatically rolls back on error

      // CRITICAL: If error is already a domain error (e.g., "Release not found"),
      // re-throw it as-is so the exception filter can map it correctly
      // Otherwise, wrap it in a generic "Transaction failed" error
      if (error.name && error.name.endsWith('Error') && error.message) {
        // Already a domain error - preserve it
        throw error;
      }

      throw this.createDomainError('Transaction failed', error, context);
    }
  }

  /**
   * Time an operation without the full executeOperation wrapper
   * Useful for simple operations that don't need error translation
   */
  protected async timeOperation<T>(
    operation: () => Promise<T>,
    operationName: string,
  ): Promise<T> {
    const startTime = Date.now();
    try {
      return await operation();
    } finally {
      const duration = Date.now() - startTime;
      this.logger.debug(`${operationName} took ${duration}ms`);
    }
  }

  // ==================== VALIDATION HELPERS ====================

  /**
   * Validate that a value is provided
   */
  protected validateRequired(
    value: any,
    fieldName: string,
    entity?: string,
  ): void {
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      const entityMsg = entity ? ` for ${entity}` : '';
      throw this.createDomainError(`${fieldName} is required${entityMsg}`);
    }
  }

  /**
   * Validate that an array is not empty
   */
  protected validateNotEmpty(
    array: any[],
    fieldName: string,
    entity?: string,
  ): void {
    if (!array || array.length === 0) {
      const entityMsg = entity ? ` for ${entity}` : '';
      throw this.createDomainError(`${fieldName} cannot be empty${entityMsg}`);
    }
  }

  /**
   * Validate that a number is positive
   */
  protected validatePositive(value: number, fieldName: string): void {
    if (value <= 0) {
      throw this.createDomainError(`${fieldName} must be positive`);
    }
  }

  /**
   * Validate that a value is within a range
   */
  protected validateRange(
    value: number,
    min: number,
    max: number,
    fieldName: string,
  ): void {
    if (value < min || value > max) {
      throw this.createDomainError(
        `${fieldName} must be between ${min} and ${max}`,
      );
    }
  }

  /**
   * Validate that two values match (e.g., min <= max)
   */
  protected validateOrder(
    minValue: number,
    maxValue: number,
    minField: string,
    maxField: string,
  ): void {
    if (minValue > maxValue) {
      throw this.createDomainError(
        `${minField} cannot exceed ${maxField}`,
      );
    }
  }

  /**
   * Validate that a value is one of allowed options
   */
  protected validateEnum<T>(
    value: T,
    allowedValues: T[],
    fieldName: string,
  ): void {
    if (!allowedValues.includes(value)) {
      throw this.createDomainError(
        `${fieldName} must be one of: ${allowedValues.join(', ')}`,
      );
    }
  }
}
