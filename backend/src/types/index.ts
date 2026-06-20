export type Sender = 'user' | 'ai';

export interface Conversation {
  id: string;
  channel: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  sender: Sender;
  text: string;
  createdAt: string;
}

export interface Faq {
  id: string;
  topic: string;
  question: string;
  answer: string;
  createdAt: string;
}

export interface LlmHistoryTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequestBody {
  message: string;
  conversationId?: string;
}

export interface ChatResponseBody {
  conversationId: string;
  message: ChatMessage;
}

export interface HistoryResponseBody {
  conversationId: string;
  messages: ChatMessage[];
}
