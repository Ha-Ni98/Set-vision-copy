import { ErrorCode } from '@my-app/contract';
import { AppError } from './app-error';

export { AppError };

export class AuthError extends AppError {
  constructor(message = 'Unauthorized', details?: unknown) {
    super(401, ErrorCode.AUTH_UNAUTHORIZED, message, details);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden', details?: unknown) {
    super(403, ErrorCode.AUTH_FORBIDDEN, message, details);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', details?: unknown) {
    super(404, ErrorCode.RESOURCE_NOT_FOUND, message, details);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource conflict', details?: unknown) {
    super(409, ErrorCode.RESOURCE_CONFLICT, message, details);
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad request', details?: unknown) {
    super(400, ErrorCode.VALIDATION_ERROR, message, details);
  }
}
