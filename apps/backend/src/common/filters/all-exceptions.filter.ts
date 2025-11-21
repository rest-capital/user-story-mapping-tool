import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

/**
 * Global exception filter that catches ALL exceptions
 * Maps domain errors to appropriate HTTP status codes
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  // Domain error class names (from our modules)
  private readonly domainErrors = [
    'JourneyError',
    'StepError',
    'ReleaseError',
    'StoryError',
    'TagError',
    'PersonaError',
    'CommentError',
    'StoryLinkError',
  ];

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    // Handle HttpException (from NestJS) - pass through as-is
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      message =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : (exceptionResponse as any).message || message;
    }
    // Handle ONLY our domain errors (not Supabase or other errors)
    else if (
      exception instanceof Error &&
      this.domainErrors.includes(exception.name)
    ) {
      message = exception.message;

      // Map error messages to HTTP status codes
      const lowerMessage = message.toLowerCase();

      if (lowerMessage.includes('not found')) {
        status = HttpStatus.NOT_FOUND;
      } else if (
        lowerMessage.includes('required') ||
        lowerMessage.includes('invalid') ||
        lowerMessage.includes('must be') ||
        lowerMessage.includes('cannot')
      ) {
        status = HttpStatus.BAD_REQUEST;
      } else if (lowerMessage.includes('already exists')) {
        status = HttpStatus.CONFLICT;
      } else if (lowerMessage.includes('unauthorized')) {
        status = HttpStatus.UNAUTHORIZED;
      } else if (lowerMessage.includes('forbidden')) {
        status = HttpStatus.FORBIDDEN;
      }
    }
    // All other errors (including Supabase Auth errors) - pass through unchanged
    else if (exception instanceof Error) {
      message = exception.message;
      // Keep status as 500 for unknown errors
    }

    // Format error response
    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: message, // Keep as-is (string or array)
    };

    response.status(status).json(errorResponse);
  }
}
