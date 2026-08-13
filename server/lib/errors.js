class AppError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

class ValidationError extends AppError {
  constructor(message) {
    super(422, message);
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(401, message);
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Not allowed to perform this action') {
    super(403, message);
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Not found') {
    super(404, message);
  }
}

class ConflictError extends AppError {
  constructor(message) {
    super(409, message);
  }
}

module.exports = {
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
};
