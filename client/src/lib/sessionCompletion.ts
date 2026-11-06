import type { ChatMessage, SessionMeta } from '../types/chat';

const RESULTS_SECTION_MARKER = 'Почему тебе подходит:';

/** Итог выдан: в переписке есть сообщения с разбором стилей (после split на сервере). */
export function sessionHasFinalResults(messages: ChatMessage[]): boolean {
  return messages.some(
    (m) => m.role === 'assistant' && m.content.includes(RESULTS_SECTION_MARKER)
  );
}

/** Согласовать флаг completed с фактическим наличием итога в сообщениях. */
export function reconcileSessionMeta(messages: ChatMessage[], meta: SessionMeta): SessionMeta {
  const hasResults = sessionHasFinalResults(messages);
  if (hasResults) {
    return { ...meta, completed: true, phase: 'results' };
  }
  return {
    ...meta,
    completed: false,
    phase: meta.phase === 'results' ? 'interview' : meta.phase,
  };
}
