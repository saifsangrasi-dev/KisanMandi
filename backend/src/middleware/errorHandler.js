/**
 * KisanMandi Centralized Error Handling Middleware
 */

export class AppError extends Error {
  constructor(message, statusCode = 400, code = 'BAD_REQUEST') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

export function notFoundHandler(req, res, next) {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Cannot ${req.method} ${req.originalUrl}`
    }
  });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || (err.status ? Number(err.status) : 500);
  const code = err.code || (statusCode === 404 ? 'NOT_FOUND' : statusCode === 409 ? 'CONFLICT' : statusCode === 403 ? 'FORBIDDEN' : 'SERVER_ERROR');
  const message = err.message || 'An unexpected server error occurred';

  // In production / hackathon client responses, never leak stack traces
  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message
    }
  });
}
