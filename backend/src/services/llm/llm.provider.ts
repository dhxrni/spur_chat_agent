import type { LlmHistoryTurn } from '../../types';

export interface GenerateReplyParams {
  systemPrompt: string;
  history: LlmHistoryTurn[];
  userMessage: string;
}

export interface LlmProvider {
  generateReply(params: GenerateReplyParams): Promise<string>;
}

export type LlmErrorKind =
  | 'timeout'
  | 'auth'
  | 'rate_limit'
  | 'invalid_request'
  | 'unknown';

export class LlmError extends Error {
  readonly kind: LlmErrorKind;
  override readonly cause?: unknown;

  constructor(message: string, kind: LlmErrorKind, cause?: unknown) {
    super(message);
    this.name = 'LlmError';
    this.kind = kind;
    this.cause = cause;
  }
}
