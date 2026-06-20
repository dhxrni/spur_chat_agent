import type { LlmHistoryTurn } from '../../types';
import { getKnowledgeBasePrompt } from '../knowledge.service';
import { GeminiProvider } from './gemini.provider';
import type { LlmProvider } from './llm.provider';

const provider: LlmProvider = new GeminiProvider();

const BASE_SYSTEM_PROMPT = `\
You are a helpful, friendly customer support agent for Example Store.

Guidelines:
- Keep replies concise: 2–4 sentences is the norm. Be direct and warm.
- Use the STORE KNOWLEDGE section below to answer questions accurately. Do not invent \
policies, prices, timelines, or procedures that are not stated there.
- If you genuinely don't know the answer or the topic isn't covered in the knowledge \
base, say so honestly and direct the customer to our support email: \
support@examplestore.com.
- Stay on topic. You are here to help with orders, shipping, returns, payments, and \
general store questions. Politely decline unrelated requests (e.g. writing code, \
general trivia) and redirect the conversation back to how you can help the customer.`;

function buildSystemPrompt(): string {
  return `${BASE_SYSTEM_PROMPT}\n\n${getKnowledgeBasePrompt()}`;
}

export async function generateReply(
  history: LlmHistoryTurn[],
  userMessage: string,
): Promise<string> {
  return provider.generateReply({
    systemPrompt: buildSystemPrompt(),
    history,
    userMessage,
  });
}
