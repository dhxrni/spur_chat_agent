import type { ApiErrorBody, ChatResponseBody, HistoryResponseBody } from './types';

export class ApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

const BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:3001';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...init,
    });
  } catch {
    throw new ApiError("Couldn't reach the server. Check your connection and try again.");
  }

  if (!response.ok) {
    let message = `Request failed with status ${response.status}.`;
    try {
      const body = (await response.json()) as ApiErrorBody;
      if (body.message) message = body.message;
    } catch {
      // body wasn't valid JSON — use the generic message above
    }
    throw new ApiError(message, response.status);
  }

  return response.json() as Promise<T>;
}

export function sendMessage(
  message: string,
  sessionId?: string,
): Promise<ChatResponseBody> {
  return request<ChatResponseBody>('/chat/message', {
    method: 'POST',
    body: JSON.stringify(sessionId ? { message, sessionId } : { message }),
  });
}

export async function fetchHistory(
  sessionId: string,
): Promise<HistoryResponseBody | null> {
  try {
    return await request<HistoryResponseBody>(`/chat/history/${sessionId}`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}
