import type { ErrorRequestHandler, RequestHandler } from 'express';

import type { ApiErrorResponse } from '../domain/index.js';
import { AppError, toAppError } from '../lib/errors.js';

function isBodyParseError(error: unknown): boolean {
  return error instanceof SyntaxError && 'type' in error && error.type === 'entity.parse.failed';
}

export const notFound: RequestHandler = (req, _res, next) => {
  next(AppError.notFound(`No route for ${req.method} ${req.path}`));
};

export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  const appError = isBodyParseError(error)
    ? AppError.badRequest('INVALID_JSON', 'Request body is not valid JSON')
    : toAppError(error);
  const log = appError.status >= 500 ? req.log.error.bind(req.log) : req.log.warn.bind(req.log);
  log({ err: error, code: appError.code }, appError.message);

  const body: ApiErrorResponse = { error: appError.toPayload() };
  res.status(appError.status).json(body);
};
