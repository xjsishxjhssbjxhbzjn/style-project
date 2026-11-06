import { AppError, formatUnknownError, parseApiResponse } from '../lib/errors';
import type { ChatMessage, SessionMeta } from '../types/chat';

export type AssistantPayload = {
  role: 'assistant';
  content: string;
  images?: string[];
};

export type ChatApiResponse = {
  messages: AssistantPayload[];
  sessionMeta: SessionMeta;
};

export async function fetchHealth(): Promise<{ configured: boolean }> {
  try {
    const res = await fetch('/api/health');
    if (!res.ok) await parseApiResponse(res);
    return res.json();
  } catch (e) {
    throw formatUnknownError(e);
  }
}

export async function sendChatRequest(body: {
  messages: { role: 'user' | 'assistant'; content: string }[];
  sessionMeta?: SessionMeta;
  init?: boolean;
}): Promise<ChatApiResponse> {
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) await parseApiResponse(res);
    const data = (await res.json()) as ChatApiResponse & {
      message?: AssistantPayload;
    };
    if (data.messages?.length) return data as ChatApiResponse;
    if (data.message) {
      return { messages: [data.message], sessionMeta: data.sessionMeta };
    }
    throw new AppError('REQUEST_FAILED', 'Пустой ответ сервера.');
  } catch (e) {
    if (e instanceof AppError) throw e;
    throw formatUnknownError(e);
  }
}

export function toApiHistory(messages: ChatMessage[]) {
  return messages.map((m) => ({ role: m.role, content: m.content }));
}
