import type { Request, Response } from 'express';
import {
  handleIncomingMessage,
  getConversationHistory,
} from '../services/conversation.service';

export async function postMessage(req: Request, res: Response): Promise<void> {
  const { message, sessionId } = req.body as {
    message: string;
    sessionId?: string;
  };

  const result = await handleIncomingMessage(message, sessionId);

  res.status(200).json({
    reply: result.reply,
    sessionId: result.sessionId,
  });
}

export async function getHistory(req: Request, res: Response): Promise<void> {
  const { sessionId } = req.params;

  const messages = getConversationHistory(sessionId);
  if (messages === null) {
    res.status(404).json({
      error: 'not_found',
      message: `Conversation ${sessionId} does not exist.`,
    });
    return;
  }

  res.status(200).json({
    sessionId,
    messages: messages.map((m) => ({
      id: m.id,
      sender: m.sender,
      text: m.text,
      createdAt: m.createdAt,
    })),
  });
}
