import { attachImagesToContent, parseStoredMessage } from '../lib/messageImages';
import { reconcileSessionMeta } from '../lib/sessionCompletion';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { ChatMessage, SessionMeta } from '../types/chat';
import { defaultMeta } from '../types/chat';

function rowToChatMessage(r: {
  id: string;
  role: string;
  content: string;
  created_at: string;
}): ChatMessage {
  const parsed = parseStoredMessage(r.content);
  return {
    id: r.id,
    role: r.role as 'user' | 'assistant',
    content: parsed.content,
    images: parsed.images,
    createdAt: new Date(r.created_at).getTime(),
  };
}

const GUEST_KEY = 'uznay-stil-guest-v1';
const GUEST_ARCHIVE_KEY = 'uznay-stil-guest-archive-v1';

export type GuestCache = {
  messages: ChatMessage[];
  meta: SessionMeta;
};

export function loadGuestCache(): GuestCache | null {
  try {
    const raw = localStorage.getItem(GUEST_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as GuestCache;
  } catch {
    return null;
  }
}

export function saveGuestCache(data: GuestCache) {
  localStorage.setItem(GUEST_KEY, JSON.stringify(data));
}

export function clearGuestCache() {
  localStorage.removeItem(GUEST_KEY);
}

function isIncompleteDraft(messages: ChatMessage[], meta: SessionMeta): boolean {
  return messages.length > 0 && !meta.completed;
}

export function hasGuestDraft(): boolean {
  const guest = loadGuestCache();
  if (!guest) return false;
  return isIncompleteDraft(guest.messages, guest.meta);
}

/** Сохранить текущий гостевой черновик перед новым опросом (без аккаунта). */
export function archiveGuestDraft(): void {
  const guest = loadGuestCache();
  if (!guest || !isIncompleteDraft(guest.messages, guest.meta)) return;
  localStorage.setItem(GUEST_ARCHIVE_KEY, JSON.stringify(guest));
}

export async function hasInProgressDraft(userId: string | null): Promise<boolean> {
  if (hasGuestDraft()) return true;
  if (!userId || !supabase) return false;
  const active = await loadActiveSession(userId);
  if (!active?.ok) return false;
  return isIncompleteDraft(active.messages, active.meta);
}

export async function discardInProgressDraft(userId: string | null): Promise<void> {
  clearGuestCache();
  localStorage.removeItem(GUEST_ARCHIVE_KEY);
  if (!userId || !supabase) return;
  const active = await loadActiveSession(userId);
  if (active?.ok && isIncompleteDraft(active.messages, active.meta)) {
    await deleteRemoteSession(active.sessionId);
  }
}

export type LoadSessionResult =
  | { ok: true; sessionId: string; messages: ChatMessage[]; meta: SessionMeta }
  | { ok: false; message: string };

export async function loadActiveSession(userId: string): Promise<LoadSessionResult | null> {
  if (!supabase) return null;

  const { data: sessions, error } = await supabase
    .from('chat_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('completed', false)
    .order('updated_at', { ascending: false })
    .limit(1);

  if (error) {
    return { ok: false, message: `Supabase (сессии): ${error.message}` };
  }
  if (!sessions?.length) return null;
  const session = sessions[0];

  const { data: rows, error: msgErr } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('session_id', session.id)
    .order('created_at', { ascending: true });

  if (msgErr) {
    return { ok: false, message: `Supabase (сообщения): ${msgErr.message}` };
  }

  const messages: ChatMessage[] = (rows ?? []).map((r) => rowToChatMessage(r));

  const meta = reconcileSessionMeta(messages, {
    substantiveAnswerCount: session.substantive_answer_count,
    phase: session.phase as SessionMeta['phase'],
    completed: session.completed,
  });

  if (
    meta.completed !== session.completed ||
    meta.phase !== (session.phase as SessionMeta['phase'])
  ) {
    void updateRemoteMeta(session.id as string, meta);
  }

  return {
    ok: true,
    sessionId: session.id as string,
    messages,
    meta,
  };
}

export async function createRemoteSession(userId: string): Promise<string | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('chat_sessions')
    .insert({
      user_id: userId,
      substantive_answer_count: 0,
      phase: 'interview',
      completed: false,
    })
    .select('id')
    .single();
  if (error) {
    throw new Error(`Supabase (создание сессии): ${error.message}`);
  }
  return data.id as string;
}

export async function updateRemoteMeta(sessionId: string, meta: SessionMeta) {
  if (!supabase) return;
  await supabase
    .from('chat_sessions')
    .update({
      substantive_answer_count: meta.substantiveAnswerCount,
      phase: meta.phase,
      completed: meta.completed,
      updated_at: new Date().toISOString(),
    })
    .eq('id', sessionId);
}

export async function insertRemoteMessage(
  sessionId: string,
  role: 'user' | 'assistant',
  content: string,
  images?: string[]
): Promise<ChatMessage | null> {
  if (!supabase) return null;
  const stored = attachImagesToContent(content, images);
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({ session_id: sessionId, role, content: stored })
    .select('*')
    .single();
  if (error || !data) return null;
  return rowToChatMessage(data);
}

export async function mergeGuestIntoAccount(userId: string, guest: GuestCache) {
  if (!supabase || !guest.messages.length) return null;
  const sessionId = await createRemoteSession(userId);
  if (!sessionId) return null;
  for (const m of guest.messages) {
    await insertRemoteMessage(sessionId, m.role, m.content, m.images);
  }
  await updateRemoteMeta(sessionId, guest.meta);
  clearGuestCache();
  return sessionId;
}

export type HistorySessionSummary = {
  id: string;
  updated_at: string;
  substantive_answer_count: number;
  completed: boolean;
  phase: string;
};

export async function loadHistorySessions(userId: string): Promise<HistorySessionSummary[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('chat_sessions')
    .select('id, updated_at, substantive_answer_count, completed, phase')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(15);
  if (error) {
    throw new Error(`Supabase (история): ${error.message}`);
  }
  const sessions = (data ?? []) as HistorySessionSummary[];
  if (sessions.length === 0) return sessions;

  const ids = sessions.map((s) => s.id);
  const { data: msgRows } = await supabase
    .from('chat_messages')
    .select('session_id, role, content, created_at')
    .in('session_id', ids)
    .order('created_at', { ascending: true });

  const messagesBySession = new Map<string, ChatMessage[]>();
  for (const row of msgRows ?? []) {
    const parsed = parseStoredMessage(row.content);
    const list = messagesBySession.get(row.session_id) ?? [];
    list.push({
      id: row.session_id + String(list.length),
      role: row.role as 'user' | 'assistant',
      content: parsed.content,
      images: parsed.images,
      createdAt: new Date(row.created_at).getTime(),
    });
    messagesBySession.set(row.session_id, list);
  }

  return sessions.map((s) => {
    const messages = messagesBySession.get(s.id) ?? [];
    const meta = reconcileSessionMeta(messages, {
      substantiveAnswerCount: s.substantive_answer_count,
      phase: s.phase as SessionMeta['phase'],
      completed: s.completed,
    });
    return { ...s, completed: meta.completed, phase: meta.phase };
  });
}

export type SessionDetail = {
  sessionId: string;
  messages: ChatMessage[];
  meta: SessionMeta;
  completed: boolean;
};

export async function loadSessionDetail(sessionId: string): Promise<SessionDetail | null> {
  if (!supabase) return null;

  const { data: session, error } = await supabase
    .from('chat_sessions')
    .select('id, substantive_answer_count, phase, completed')
    .eq('id', sessionId)
    .maybeSingle();

  if (error || !session) return null;

  const messages = await loadSessionMessages(sessionId);
  const meta = reconcileSessionMeta(messages, {
    substantiveAnswerCount: session.substantive_answer_count,
    phase: session.phase as SessionMeta['phase'],
    completed: session.completed,
  });

  if (
    meta.completed !== session.completed ||
    meta.phase !== (session.phase as SessionMeta['phase'])
  ) {
    void updateRemoteMeta(sessionId, meta);
  }

  return {
    sessionId: session.id as string,
    messages,
    meta,
    completed: meta.completed,
  };
}

export async function deleteRemoteSession(sessionId: string): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase не настроен.');
  }
  const { error } = await supabase.from('chat_sessions').delete().eq('id', sessionId);
  if (error) {
    throw new Error(`Supabase (удаление): ${error.message}`);
  }
}

export async function loadSessionMessages(sessionId: string) {
  if (!supabase) return [];
  const { data } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });
  return (data ?? []).map((r) => rowToChatMessage(r));
}

export function isPersistenceAvailable() {
  return isSupabaseConfigured;
}

export function emptyGuest(): GuestCache {
  return { messages: [], meta: defaultMeta() };
}
