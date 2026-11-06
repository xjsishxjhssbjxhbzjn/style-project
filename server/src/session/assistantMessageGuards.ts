import { parseAssistantMeta } from './parseAssistantMeta.js';
import { parseResultsBlock } from './parseResults.js';

export const INTERVIEW_ASSISTANT_FALLBACK =
  'Понимаю, бывает сложно сформулировать сразу. Давай проще: что тебе ближе — более спокойные, приглушённые цвета или сочные и заметные? Можно ответить в двух словах.';

export const RESULTS_ASSISTANT_FALLBACK = 'Вот что я для тебя подобрал!';

export type AssistantPayload = {
  role: 'assistant';
  content: string;
  images?: string[];
};

export function visibleAssistantTextFromRaw(raw: string): string {
  const { content } = parseAssistantMeta(raw);
  const { contentWithoutResults } = parseResultsBlock(content);
  return contentWithoutResults.trim();
}

export function visibleAssistantTextFromParsed(content: string): string {
  const { contentWithoutResults } = parseResultsBlock(content);
  return contentWithoutResults.trim();
}

export function ensureNonEmptyAssistantMessages(
  messages: AssistantPayload[],
  completed: boolean
): AssistantPayload[] {
  const filtered = messages.filter((m) => m.content.trim().length > 0);
  if (filtered.length > 0) return filtered;
  return [
    {
      role: 'assistant',
      content: completed ? RESULTS_ASSISTANT_FALLBACK : INTERVIEW_ASSISTANT_FALLBACK,
    },
  ];
}
