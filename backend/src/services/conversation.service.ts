import { config } from '../config';
import * as conversationRepo from '../repositories/conversation.repository';
import * as messageRepo from '../repositories/message.repository';
import type { ChatMessage, LlmHistoryTurn } from '../types';
import { generateReply } from './llm/llm.service';
import { LlmError } from './llm/llm.provider';

const FRIENDLY_ERRORS: Record<LlmError['kind'], string> = {
  timeout:
    "I'm sorry, it's taking longer than usual to get a response. Please try again in a moment.",
  auth:
    "I'm temporarily unable to process your request due to a configuration issue. Please contact support@examplestore.com for help.",
  rate_limit:
    "We're experiencing high demand right now. Please wait a few seconds and try again.",
  invalid_request:
    "I wasn't able to process that message. Could you rephrase it and try again?",
  unknown:
    "Something went wrong on our end. If this keeps happening, please reach out to support@examplestore.com.",
};

const TRUNCATION_NOTE =
  '\n\n*(Your message was very long and was shortened before being processed.)*';

export async function handleIncomingMessage(
  rawMessage: string,
  sessionId?: string,
): Promise<{ reply: string; sessionId: string }> {
  // 1. Trim and truncate
  const trimmed = rawMessage.trim();
  const { maxMessageLength, maxHistoryMessages } = config.guardrails;
  const wasTruncated = trimmed.length > maxMessageLength;
  const message = wasTruncated ? trimmed.slice(0, maxMessageLength) : trimmed;

  // 2. Resolve conversation
  let conversation = sessionId ? conversationRepo.findById(sessionId) : null;
  if (!conversation) {
    conversation = conversationRepo.create('web');
  }

  // 3. Persist user message and touch updated_at
  messageRepo.create(conversation.id, 'user', message);
  conversationRepo.touchUpdatedAt(conversation.id);

  // 4. Fetch recent history, then drop the last entry (the message we just inserted)
  const recentMessages = messageRepo.findRecentByConversation(
    conversation.id,
    maxHistoryMessages,
  );
  const historyMessages = recentMessages.slice(0, -1);

  const history: LlmHistoryTurn[] = historyMessages.map((m) => ({
    role: m.sender === 'user' ? 'user' : 'assistant',
    content: m.text,
  }));

  // 5. Call the LLM — never let an error propagate unhandled
  let reply: string;
  try {
    reply = await generateReply(history, message);
  } catch (err) {
    if (err instanceof LlmError) {
      console.error(`[conversation.service] LlmError (${err.kind}):`, err.cause ?? err);
      reply = FRIENDLY_ERRORS[err.kind];
    } else {
      console.error('[conversation.service] Unexpected error:', err);
      reply = FRIENDLY_ERRORS.unknown;
    }
  }

  // 6. Append truncation note if the original message was shortened
  if (wasTruncated) {
    reply += TRUNCATION_NOTE;
  }

  // 7. Persist the AI reply
  messageRepo.create(conversation.id, 'ai', reply);
  conversationRepo.touchUpdatedAt(conversation.id);

  // 8. Return
  return { reply, sessionId: conversation.id };
}

export function getConversationHistory(
  sessionId: string,
): ChatMessage[] | null {
  const conversation = conversationRepo.findById(sessionId);
  if (!conversation) return null;
  return messageRepo.findAllByConversation(sessionId);
}
