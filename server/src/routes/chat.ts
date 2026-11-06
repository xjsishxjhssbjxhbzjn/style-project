import type { Content } from '@google/generative-ai';
import { Router, Request, Response } from 'express';
import { generateWithRetry } from '../gemini/generateWithRetry.js';
import { getGenerativeModel } from '../gemini/client.js';
import {
  buildEmptyVisibleTextRetryContents,
  buildGeminiContents,
  buildRetryContents,
} from '../prompts/buildMessages.js';
import {
  ensureNonEmptyAssistantMessages,
  visibleAssistantTextFromParsed,
  type AssistantPayload,
} from '../session/assistantMessageGuards.js';
import {
  finalizeSessionMeta,
  mergeSessionMeta,
  parseAssistantMeta,
} from '../session/parseAssistantMeta.js';
import { buildResultMessages, parseResultsBlock } from '../session/parseResults.js';
import { sendError, upstreamDetail } from '../errors/apiErrors.js';

function buildApiMessages(content: string, merged: SessionMeta): AssistantPayload[] {
  const { contentWithoutResults, results } = parseResultsBlock(content);
  if (merged.phase === 'results' && merged.completed && results) {
    return buildResultMessages(results);
  }
  const text = contentWithoutResults.trim() || content.trim();
  return [{ role: 'assistant', content: text }];
}

export const chatRouter = Router();

const rateMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60_000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  let entry = rateMap.get(ip);
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + RATE_WINDOW_MS };
    rateMap.set(ip, entry);
  }
  entry.count += 1;
  return entry.count <= RATE_LIMIT;
}

type SessionMeta = {
  substantiveAnswerCount: number;
  phase: 'interview' | 'results';
  completed: boolean;
};

type TurnState = {
  raw: string;
  content: string;
  merged: SessionMeta;
};

async function generate(
  model: NonNullable<ReturnType<typeof getGenerativeModel>>,
  contents: Content[]
): Promise<string> {
  const result = await model.generateContent({
    contents,
    generationConfig: {
      temperature: 0.8,
    },
  });
  try {
    return result.response.text()?.trim() ?? '';
  } catch {
    return '';
  }
}

function parseTurn(raw: string, prevMeta: SessionMeta): TurnState {
  const { content, meta } = parseAssistantMeta(raw);
  return {
    raw,
    content,
    merged: mergeSessionMeta(prevMeta, meta),
  };
}

function cloneTurn(state: TurnState): TurnState {
  return {
    raw: state.raw,
    content: state.content,
    merged: { ...state.merged },
  };
}

/** Снимок для отката, если follow-up запрос к Gemini не удался. */
function normalizeAfterFailedFollowUp(state: TurnState): TurnState {
  const next = cloneTurn(state);
  if (next.merged.substantiveAnswerCount < 15) {
    next.merged = { ...next.merged, phase: 'interview', completed: false };
  }
  return next;
}

async function requestTurn(
  model: NonNullable<ReturnType<typeof getGenerativeModel>>,
  contents: Content[],
  prevMeta: SessionMeta
): Promise<TurnState> {
  const raw = await generateWithRetry(() => generate(model, contents));
  return parseTurn(raw, prevMeta);
}

async function requestTurnOrRevert(
  model: NonNullable<ReturnType<typeof getGenerativeModel>>,
  contents: Content[],
  prevMeta: SessionMeta,
  revertTo: TurnState,
  label: string
): Promise<TurnState> {
  try {
    return await requestTurn(model, contents, prevMeta);
  } catch (err) {
    console.warn(`Gemini ${label} failed, using previous response:`, err);
    return normalizeAfterFailedFollowUp(revertTo);
  }
}

function finalizeTurn(state: TurnState, prevMeta: SessionMeta): TurnState {
  const next = cloneTurn(state);
  const { results } = parseResultsBlock(next.content);
  next.merged = finalizeSessionMeta(next.merged, Boolean(results));
  if (!next.raw.trim()) {
    next.merged = mergeSessionMeta(prevMeta, null);
  }
  return next;
}

chatRouter.post('/', async (req: Request, res: Response) => {
  const ip = req.ip || 'unknown';
  if (!checkRateLimit(ip)) {
    sendError(res, 429, 'RATE_LIMIT');
    return;
  }

  const model = getGenerativeModel();
  if (!model) {
    sendError(res, 503, 'API_NOT_CONFIGURED');
    return;
  }

  const { messages, sessionMeta, init } = req.body as {
    messages?: { role: 'user' | 'assistant'; content: string }[];
    sessionMeta?: SessionMeta;
    init?: boolean;
  };

  const history = messages ?? [];
  if (!init && history.length === 0) {
    sendError(res, 400, 'EMPTY_HISTORY');
    return;
  }

  const lastUser = [...history].reverse().find((m) => m.role === 'user');
  if (lastUser && lastUser.content.length > 4000) {
    sendError(res, 400, 'MESSAGE_TOO_LONG');
    return;
  }

  const prevMeta: SessionMeta = sessionMeta ?? {
    substantiveAnswerCount: 0,
    phase: 'interview',
    completed: false,
  };

  const baseContents = () => buildGeminiContents(history, Boolean(init));

  try {
    let turn = await requestTurn(model, baseContents(), prevMeta);
    const firstSuccess = cloneTurn(turn);

    if (turn.merged.phase === 'results' && turn.merged.substantiveAnswerCount < 15) {
      turn = await requestTurnOrRevert(
        model,
        [...baseContents(), ...buildRetryContents(turn.merged.substantiveAnswerCount, turn.raw)],
        prevMeta,
        firstSuccess,
        'early-results retry'
      );
      if (turn.merged.substantiveAnswerCount < 15) {
        turn.merged = { ...turn.merged, phase: 'interview', completed: false };
      }
    }

    turn = finalizeTurn(turn, prevMeta);

    if (!turn.merged.completed && !visibleAssistantTextFromParsed(turn.content)) {
      if (turn.raw.trim()) {
        const beforeEmptyRetry = cloneTurn(turn);
        turn = await requestTurnOrRevert(
          model,
          [...baseContents(), ...buildEmptyVisibleTextRetryContents(turn.raw)],
          prevMeta,
          beforeEmptyRetry,
          'empty-text retry'
        );
        if (turn.merged.phase === 'results' && turn.merged.substantiveAnswerCount < 15) {
          turn.merged = { ...turn.merged, phase: 'interview', completed: false };
        }
        turn = finalizeTurn(turn, prevMeta);
      } else {
        turn.merged = mergeSessionMeta(prevMeta, null);
      }
    }

    let apiMessages = buildApiMessages(turn.content, turn.merged);
    apiMessages = ensureNonEmptyAssistantMessages(apiMessages, turn.merged.completed);
    res.json({
      messages: apiMessages,
      sessionMeta: turn.merged,
    });
  } catch (err) {
    console.error('Gemini error:', err);
    sendError(res, 502, 'UPSTREAM_ERROR', upstreamDetail(err));
  }
});
