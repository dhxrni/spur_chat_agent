import { Router } from 'express';
import { postMessage, getHistory } from '../controllers/chat.controller';
import { asyncHandler } from '../middleware/errorHandler';
import {
  validateBody,
  validateParams,
  chatMessageSchema,
  historyParamsSchema,
} from '../middleware/validate';

export const chatRouter = Router();

chatRouter.post(
  '/message',
  validateBody(chatMessageSchema),
  asyncHandler(postMessage),
);

chatRouter.get(
  '/history/:sessionId',
  validateParams(historyParamsSchema),
  asyncHandler(getHistory),
);
