import { GoogleGenAI, ApiError } from '@google/genai';
import { config } from '../../config';
import type { GenerateReplyParams, LlmProvider } from './llm.provider';
import { LlmError } from './llm.provider';

const client = new GoogleGenAI({ apiKey: config.llm.geminiApiKey });

export class GeminiProvider implements LlmProvider {
  async generateReply(params: GenerateReplyParams): Promise<string> {
    const contents = [
      ...params.history.map((turn) => ({
        role: turn.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: turn.content }],
      })),
      { role: 'user', parts: [{ text: params.userMessage }] },
    ];

    try {
      const response = await client.models.generateContent({
        model: config.llm.model,
        contents,
        config: {
          systemInstruction: params.systemPrompt,
          maxOutputTokens: config.llm.maxTokens,
          httpOptions: { timeout: config.llm.timeoutMs },
        },
      });

      const text = response.text;
      if (!text) {
        throw new LlmError('Gemini returned no text content', 'unknown');
      }
      return text;
    } catch (err) {
      if (err instanceof LlmError) throw err;

      if (
        err instanceof Error &&
        /timeout|timed out|aborted/i.test(err.message)
      ) {
        throw new LlmError('Request timed out', 'timeout', err);
      }

      if (err instanceof ApiError) {
        const status = err.status;
        if (status === 401 || status === 403) {
          throw new LlmError('Authentication failed', 'auth', err);
        }
        if (status === 429) {
          throw new LlmError('Rate limit exceeded', 'rate_limit', err);
        }
        if (status === 400) {
          throw new LlmError('Invalid request', 'invalid_request', err);
        }
        throw new LlmError(err.message, 'unknown', err);
      }

      throw new LlmError('Unexpected error', 'unknown', err);
    }
  }
}
