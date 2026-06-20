import type { Request, Response, NextFunction, RequestHandler } from 'express';

type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<unknown>;

export function asyncHandler(fn: AsyncRequestHandler): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  if (err instanceof SyntaxError && (err as { type?: string }).type === 'entity.parse.failed') {
    res.status(400).json({
      error: 'validation_error',
      message: 'Request body is not valid JSON.',
    });
    return;
  }
  console.error('[errorHandler]', err);
  res.status(500).json({
    error: 'internal_error',
    message: 'An unexpected error occurred. Please try again later.',
  });
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: 'not_found',
    message: `Route ${req.method} ${req.path} does not exist.`,
  });
}
