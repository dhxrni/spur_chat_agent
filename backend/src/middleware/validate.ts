import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

export const chatMessageSchema = z.object({
  message: z
    .string()
    .min(1, 'message must not be empty')
    .refine((s) => s.trim().length > 0, 'message must not be whitespace only'),
  sessionId: z.string().uuid('sessionId must be a valid UUID').optional(),
});

export const historyParamsSchema = z.object({
  sessionId: z.string().uuid('sessionId must be a valid UUID'),
});

export function validateBody<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        error: 'validation_error',
        message: 'Request body is invalid.',
        details: result.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
      return;
    }
    req.body = result.data;
    next();
  };
}

export function validateParams<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      res.status(400).json({
        error: 'validation_error',
        message: 'Request parameters are invalid.',
        details: result.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
      return;
    }
    req.params = result.data;
    next();
  };
}
