export type MessageRole = 'user' | 'assistant';

export type ChatMessage = {
  id: string;
  role: MessageRole;
  content: string;
  images?: string[];
  createdAt: number;
};

export type SessionMeta = {
  substantiveAnswerCount: number;
  phase: 'interview' | 'results';
  completed: boolean;
};

export type ChatSessionState = {
  messages: ChatMessage[];
  meta: SessionMeta;
  remoteSessionId?: string;
};

export const defaultMeta = (): SessionMeta => ({
  substantiveAnswerCount: 0,
  phase: 'interview',
  completed: false,
});
