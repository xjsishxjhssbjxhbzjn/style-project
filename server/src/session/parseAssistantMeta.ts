export type AssistantMeta = {
  substantiveAnswerCount: number;
  phase: 'interview' | 'results';
  readyForResults?: boolean;
};

const META_REGEX = /<!--META(\{[\s\S]*?\})-->/;

export function parseAssistantMeta(raw: string): {
  content: string;
  meta: AssistantMeta | null;
} {
  const match = raw.match(META_REGEX);
  if (!match) {
    return { content: raw.trim(), meta: null };
  }
  const content = raw.replace(META_REGEX, '').trim();
  try {
    const parsed = JSON.parse(match[1]) as AssistantMeta;
    if (
      typeof parsed.substantiveAnswerCount !== 'number' ||
      (parsed.phase !== 'interview' && parsed.phase !== 'results')
    ) {
      return { content, meta: null };
    }
    return { content, meta: parsed };
  } catch {
    return { content, meta: null };
  }
}

export function mergeSessionMeta(
  prev: { substantiveAnswerCount: number; phase: 'interview' | 'results'; completed: boolean },
  meta: AssistantMeta | null
): { substantiveAnswerCount: number; phase: 'interview' | 'results'; completed: boolean } {
  if (!meta) return prev;
  const count = Math.max(prev.substantiveAnswerCount, meta.substantiveAnswerCount);
  let phase = meta.phase;
  if (count < 15 && phase === 'results') {
    phase = 'interview';
  }
  return { substantiveAnswerCount: count, phase, completed: false };
}

/** Завершён только опрос с валидным блоком RESULTS (итоговые стили). */
export function finalizeSessionMeta(
  merged: { substantiveAnswerCount: number; phase: 'interview' | 'results'; completed: boolean },
  hasValidResults: boolean
): { substantiveAnswerCount: number; phase: 'interview' | 'results'; completed: boolean } {
  if (hasValidResults && merged.substantiveAnswerCount >= 15) {
    return { ...merged, phase: 'results', completed: true };
  }
  return {
    ...merged,
    completed: false,
    phase: merged.phase === 'results' ? 'interview' : merged.phase,
  };
}
