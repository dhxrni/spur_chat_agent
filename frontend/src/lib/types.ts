export type MessageSender = 'user' | 'ai';

export interface ChatMessage {
  id: string;
  sender: MessageSender;
  text: string;
  createdAt: string;
  pending?: boolean;
  failed?: boolean;
}

export interface ChatResponseBody {
  reply: string;
  sessionId: string;
}

export interface HistoryResponseBody {
  sessionId: string;
  messages: Array<{
    id: string;
    sender: MessageSender;
    text: string;
    createdAt: string;
  }>;
}

export interface ApiErrorBody {
  error: string;
  message: string;
}
