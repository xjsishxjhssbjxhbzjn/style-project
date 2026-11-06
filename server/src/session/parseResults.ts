import { getStyleById } from '../data/styles/index.js';
import { getStylePhotoUrls } from '../stylePhotos/resolvePhotos.js';

export type ParsedStyleResult = {
  styleId: string;
  percent: number;
  /** Краткая эстетика стиля (если не задано — из каталога) */
  description?: string;
  whySuits: string;
  whatToTry: string;
  mightNotFit: string;
  howToAdapt: string;
};

function formatStyleMessage(s: ParsedStyleResult, name: string, percent: number): string {
  const header = `${name}${percent > 0 ? ` — ${percent}%` : ''}`;
  const catalog = getStyleById(s.styleId);
  const intro = (s.description?.trim() || catalog?.aesthetics || '').trim();

  const blocks: string[] = [header];
  if (intro) {
    blocks.push('', intro);
  }
  blocks.push(
    '',
    'Почему тебе подходит:',
    s.whySuits.trim(),
    '',
    'Что попробовать:',
    s.whatToTry.trim(),
    '',
    'Что может не подойти:',
    s.mightNotFit.trim(),
    '',
    'Как адаптировать под себя:',
    s.howToAdapt.trim()
  );
  return blocks.join('\n').trim();
}

export type ParsedResults = {
  intro: string;
  styles: ParsedStyleResult[];
  conclusion?: string;
};

const RESULTS_REGEX = /<!--RESULTS(\{[\s\S]*?\})-->/;

export function parseResultsBlock(raw: string): {
  contentWithoutResults: string;
  results: ParsedResults | null;
} {
  const match = raw.match(RESULTS_REGEX);
  if (!match) {
    return { contentWithoutResults: raw, results: null };
  }
  const contentWithoutResults = raw.replace(RESULTS_REGEX, '').trim();
  try {
    const parsed = JSON.parse(match[1]) as ParsedResults;
    if (!parsed.intro || !Array.isArray(parsed.styles)) {
      return { contentWithoutResults, results: null };
    }
    const styles = parsed.styles.filter(
      (st) =>
        st.styleId &&
        typeof st.whySuits === 'string' &&
        typeof st.whatToTry === 'string' &&
        typeof st.mightNotFit === 'string' &&
        typeof st.howToAdapt === 'string'
    );
    if (styles.length === 0) {
      return { contentWithoutResults, results: null };
    }
    return { contentWithoutResults, results: { ...parsed, styles } };
  } catch {
    return { contentWithoutResults, results: null };
  }
}

export type AssistantMessagePayload = {
  role: 'assistant';
  content: string;
  images?: string[];
};

export function buildResultMessages(results: ParsedResults): AssistantMessagePayload[] {
  const out: AssistantMessagePayload[] = [
    { role: 'assistant', content: results.intro.trim() },
  ];

  for (const s of results.styles) {
    const catalog = getStyleById(s.styleId);
    const name = catalog?.name ?? s.styleId;
    const percent = Number.isFinite(s.percent) ? Math.round(s.percent) : 0;
    const content = formatStyleMessage(s, name, percent);
    const images = getStylePhotoUrls(s.styleId, 2);
    out.push({ role: 'assistant', content, images: images.length ? images : undefined });
  }

  if (results.conclusion?.trim()) {
    out.push({ role: 'assistant', content: results.conclusion.trim() });
  }

  return out;
}
