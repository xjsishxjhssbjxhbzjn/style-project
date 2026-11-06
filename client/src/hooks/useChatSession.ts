import { useCallback, useEffect, useRef, useState } from 'react';
import { sendChatRequest, toApiHistory, type AssistantPayload } from '../api/chat';
import { AppError, formatUnknownError, messageForCode } from '../lib/errors';
import type { ChatMessage, SessionMeta } from '../types/chat';
import { defaultMeta } from '../types/chat';
import { useAuth } from '../context/AuthProvider';
import {
  clearGuestCache,
  createRemoteSession,
  insertRemoteMessage,
  loadActiveSession,
  loadGuestCache,
  deleteRemoteSession,
  loadSessionDetail,
  saveGuestCache,
  updateRemoteMeta,
} from './useChatPersistence';

function uid() {
  return crypto.randomUUID();
}

function toDisplayError(err: unknown): { text: string; retryable: boolean } {
  const appErr = formatUnknownError(err);
  return { text: appErr.message, retryable: appErr.retryable };
}

export type HistoryOpenPlan =
  | { action: 'resume'; sessionId: string }
  | { action: 'view'; sessionId: string }
  | { action: 'prompt-save-before-view'; sessionId: string }
  | { action: 'prompt-switch-incomplete'; sessionId: string }
  | { action: 'error'; message: string };

function payloadsToMessages(payloads: AssistantPayload[]): ChatMessage[] {
  const now = Date.now();
  return payloads.map((p, i) => ({
    id: uid(),
    role: 'assistant' as const,
    content: p.content,
    images: p.images,
    createdAt: now + i,
  }));
}

async function fetchInitialAssistant(sessionMeta: SessionMeta) {
  const res = await sendChatRequest({ messages: [], init: true, sessionMeta });
  return {
    assistantMessages: payloadsToMessages(res.messages),
    meta: res.sessionMeta,
  };
}

type UseChatSessionOptions = {
  /** С главной «Начать опрос»: не возобновлять черновик, открыть новый диалог. */
  startNewOnMount?: boolean;
};

export function useChatSession(options?: UseChatSessionOptions) {
  const startNewOnMountRef = useRef(Boolean(options?.startNewOnMount));
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [meta, setMeta] = useState<SessionMeta>(defaultMeta());
  const [remoteSessionId, setRemoteSessionId] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorRetryable, setErrorRetryable] = useState(true);
  const [isHistoryView, setIsHistoryView] = useState(false);
  const pendingUserRef = useRef<ChatMessage | null>(null);
  const initKeyRef = useRef<string | null | 'unset'>('unset');
  const displayedSessionIdRef = useRef<string | undefined>(undefined);

  const setAppError = useCallback((err: unknown) => {
    const { text, retryable } = toDisplayError(err);
    setError(text);
    setErrorRetryable(retryable);
  }, []);

  const persistAssistantBatch = useCallback(
    async (sessionId: string, batch: ChatMessage[]) => {
      for (const m of batch) {
        const saved = await insertRemoteMessage(sessionId, 'assistant', m.content, m.images);
        if (!saved) {
          throw new AppError('PERSISTENCE_ERROR', messageForCode('PERSISTENCE_ERROR'));
        }
      }
    },
    []
  );

  const beginNewSurvey = useCallback(async () => {
    setIsHistoryView(false);
    setError(null);
    setErrorRetryable(true);
    setMessages([]);
    setMeta(defaultMeta());
    clearGuestCache();

    let sessionId: string | undefined;
    if (user) {
      sessionId = (await createRemoteSession(user.id)) ?? undefined;
      if (!sessionId) {
        throw new AppError('PERSISTENCE_ERROR', messageForCode('PERSISTENCE_ERROR'));
      }
      setRemoteSessionId(sessionId);
      displayedSessionIdRef.current = sessionId;
    } else {
      setRemoteSessionId(undefined);
      displayedSessionIdRef.current = undefined;
    }

    setIsLoading(true);
    try {
      const freshMeta = defaultMeta();
      const { assistantMessages, meta: newMeta } = await fetchInitialAssistant(freshMeta);
      setMessages(assistantMessages);
      setMeta(newMeta);
      if (user && sessionId) {
        await persistAssistantBatch(sessionId, assistantMessages);
        await updateRemoteMeta(sessionId, newMeta);
      } else {
        saveGuestCache({ messages: assistantMessages, meta: newMeta });
      }
    } catch (e) {
      setAppError(e);
    } finally {
      setIsLoading(false);
    }
  }, [user, setAppError, persistAssistantBatch]);

  const runInit = useCallback(async () => {
    setIsInitializing(true);
    setError(null);
    setErrorRetryable(true);
    try {
      if (startNewOnMountRef.current) {
        startNewOnMountRef.current = false;
        await beginNewSurvey();
        return;
      }

      let sessionId: string | undefined;
      let initialMessages: ChatMessage[] = [];
      let initialMeta = defaultMeta();

      if (user) {
        const active = await loadActiveSession(user.id);
        if (active && !active.ok) {
          throw new AppError('LOAD_SESSION_ERROR', active.message);
        }
        if (active?.ok && active.messages.length) {
          sessionId = active.sessionId;
          initialMessages = active.messages;
          initialMeta = active.meta;
        } else if (active?.ok) {
          sessionId = active.sessionId;
        } else {
          const guest = loadGuestCache();
          if (guest?.messages.length) {
            initialMessages = guest.messages;
            initialMeta = guest.meta;
          } else {
            const id = await createRemoteSession(user.id);
            if (!id) {
              throw new AppError('PERSISTENCE_ERROR', messageForCode('PERSISTENCE_ERROR'));
            }
            sessionId = id;
          }
        }
      } else {
        const guest = loadGuestCache();
        if (guest) {
          initialMessages = guest.messages;
          initialMeta = guest.meta;
        }
      }

      setRemoteSessionId(sessionId);
      displayedSessionIdRef.current = sessionId;
      setMessages(initialMessages);
      setMeta(initialMeta);

      setIsHistoryView(false);

      if (initialMessages.length === 0) {
        setIsLoading(true);
        const { assistantMessages, meta: newMeta } = await fetchInitialAssistant(initialMeta);
        setMessages(assistantMessages);
        setMeta(newMeta);
        if (user && sessionId) {
          await persistAssistantBatch(sessionId, assistantMessages);
          await updateRemoteMeta(sessionId, newMeta);
        } else {
          saveGuestCache({ messages: assistantMessages, meta: newMeta });
        }
      }
    } catch (e) {
      setAppError(e);
    } finally {
      setIsLoading(false);
      setIsInitializing(false);
    }
  }, [user, setAppError, persistAssistantBatch, beginNewSurvey]);

  useEffect(() => {
    const nextKey = user?.id ?? null;
    if (initKeyRef.current !== 'unset' && initKeyRef.current === nextKey) return;
    initKeyRef.current = nextKey;
    void runInit();
  }, [user?.id, runInit]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isLoading || meta.completed) return;

      setError(null);
      setErrorRetryable(true);
      const userMsg: ChatMessage = {
        id: uid(),
        role: 'user',
        content: trimmed,
        createdAt: Date.now(),
      };
      pendingUserRef.current = userMsg;
      const prevMessages = messages;
      const nextMessages = [...messages, userMsg];
      setMessages(nextMessages);
      setIsLoading(true);

      try {
        let sessionId = remoteSessionId;
        if (user && !sessionId) {
          sessionId = (await createRemoteSession(user.id)) ?? undefined;
          if (!sessionId) {
            throw new AppError('PERSISTENCE_ERROR', messageForCode('PERSISTENCE_ERROR'));
          }
          setRemoteSessionId(sessionId);
          displayedSessionIdRef.current = sessionId;
          for (const m of prevMessages) {
            const ok = await insertRemoteMessage(sessionId, m.role, m.content, m.images);
            if (!ok) {
              throw new AppError('PERSISTENCE_ERROR', messageForCode('PERSISTENCE_ERROR'));
            }
          }
        }

        const res = await sendChatRequest({
          messages: toApiHistory(nextMessages),
          sessionMeta: meta,
        });
        const assistantMessages = payloadsToMessages(res.messages);
        const finalMessages = [...nextMessages, ...assistantMessages];
        setMessages(finalMessages);
        setMeta(res.sessionMeta);
        pendingUserRef.current = null;

        if (user && sessionId) {
          const u = await insertRemoteMessage(sessionId, 'user', userMsg.content);
          if (!u) {
            throw new AppError('PERSISTENCE_ERROR', messageForCode('PERSISTENCE_ERROR'));
          }
          await persistAssistantBatch(sessionId, assistantMessages);
          await updateRemoteMeta(sessionId, res.sessionMeta);
          clearGuestCache();
        } else {
          saveGuestCache({ messages: finalMessages, meta: res.sessionMeta });
        }
      } catch (e) {
        setMessages(prevMessages);
        pendingUserRef.current = null;
        setAppError(e);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, meta, messages, remoteSessionId, user, setAppError, persistAssistantBatch]
  );

  const retry = useCallback(async () => {
    setError(null);
    const pending = pendingUserRef.current;
    if (pending) {
      await sendMessage(pending.content);
      return;
    }
    const last = messages[messages.length - 1];
    if (last?.role === 'user') {
      setMessages(messages.slice(0, -1));
      await sendMessage(last.content);
      return;
    }
    if (messages.length === 0) {
      await runInit();
    }
  }, [messages, sendMessage, runInit]);

  const shouldPromptSaveBeforeHistory = useCallback(() => {
    if (!user || isHistoryView) return false;
    return messages.length > 0 && !meta.completed;
  }, [user, isHistoryView, messages.length, meta.completed]);

  const openSessionFromHistory = useCallback(async (historySessionId: string) => {
    setError(null);
    const detail = await loadSessionDetail(historySessionId);
    if (!detail) {
      setAppError(new AppError('LOAD_SESSION_ERROR', messageForCode('LOAD_SESSION_ERROR')));
      return;
    }
    if (detail.completed) {
      setRemoteSessionId(undefined);
      setIsHistoryView(true);
    } else {
      setRemoteSessionId(detail.sessionId);
      setIsHistoryView(false);
    }
    displayedSessionIdRef.current = historySessionId;
    setMessages(detail.messages);
    setMeta(detail.meta);
    setIsLoading(false);
  }, [setAppError]);

  const deleteHistorySession = useCallback(
    async (sessionId: string) => {
      try {
        await deleteRemoteSession(sessionId);
      } catch (e) {
        setAppError(e);
        return false;
      }
      if (displayedSessionIdRef.current === sessionId) {
        displayedSessionIdRef.current = undefined;
        await runInit();
      }
      return true;
    },
    [runInit, setAppError]
  );

  const saveCurrentAndOpenHistory = useCallback(
    async (historySessionId: string) => {
      await openSessionFromHistory(historySessionId);
    },
    [openSessionFromHistory]
  );

  const planHistorySessionOpen = useCallback(
    async (historySessionId: string): Promise<HistoryOpenPlan> => {
      const detail = await loadSessionDetail(historySessionId);
      if (!detail) {
        const message = messageForCode('LOAD_SESSION_ERROR');
        setAppError(new AppError('LOAD_SESSION_ERROR', message));
        return { action: 'error', message };
      }

      if (!detail.completed) {
        const switching =
          !isHistoryView &&
          messages.length > 0 &&
          !meta.completed &&
          remoteSessionId !== historySessionId;
        if (switching) {
          return { action: 'prompt-switch-incomplete', sessionId: historySessionId };
        }
        return { action: 'resume', sessionId: historySessionId };
      }

      if (shouldPromptSaveBeforeHistory()) {
        return { action: 'prompt-save-before-view', sessionId: historySessionId };
      }
      return { action: 'view', sessionId: historySessionId };
    },
    [
      isHistoryView,
      messages.length,
      meta.completed,
      remoteSessionId,
      shouldPromptSaveBeforeHistory,
      setAppError,
    ]
  );

  const restart = useCallback(async () => {
    setIsInitializing(false);
    await beginNewSurvey();
  }, [beginNewSurvey]);

  return {
    messages,
    meta,
    isLoading,
    isInitializing,
    isHistoryView,
    error,
    errorRetryable,
    sendMessage,
    retry,
    restart,
    planHistorySessionOpen,
    openSessionFromHistory,
    saveCurrentAndOpenHistory,
    deleteHistorySession,
  };
}
