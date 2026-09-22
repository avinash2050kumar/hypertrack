import type { ErrorRequestHandler, RequestHandler } from 'express';

import { JSON_BODY_LIMIT } from '../data/index.js';
import type { ApiErrorResponse } from '../domain/index.js';
import { AppError, toAppError } from '../lib/errors.js';

function isBodyParseError(error: unknown): boolean {
  return error instanceof SyntaxError && 'type' in error && error.type === 'entity.parse.failed';
}

function isBodyTooLarge(error: unknown): boolean {
  return error instanceof Error && 'type' in error && error.type === 'entity.too.large';
}

function fromBodyParser(error: unknown): AppError | null {
  if (isBodyParseError(error)) {
    return AppError.badRequest('INVALID_JSON', 'Request body is not valid JSON');
  }
  if (isBodyTooLarge(error)) {
    return new AppError(413, 'PAYLOAD_TOO_LARGE', `Request body exceeds ${JSON_BODY_LIMIT}`);
  }
  return null;
}

export const notFound: RequestHandler = (req, _res, next) => {
  next(AppError.notFound(`No route for ${req.method} ${req.path}`));
};

export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  const appError = fromBodyParser(error) ?? toAppError(error);
  const log = appError.status >= 500 ? req.log.error.bind(req.log) : req.log.warn.bind(req.log);
  log({ err: error, code: appError.code }, appError.message);

  const body: ApiErrorResponse = { error: appError.toPayload() };
  res.status(appError.status).json(body);
};
