import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { fetchHealth } from '../api/chat';
import { ApiSetupBanner } from '../components/ApiSetupBanner';
import { ChatWindow } from '../components/ChatWindow';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { DotBackground } from '../components/DotBackground';
import { useAuth } from '../context/AuthProvider';
import { useChatSession } from '../hooks/useChatSession';
import {
  loadGuestCache,
  mergeGuestIntoAccount,
} from '../hooks/useChatPersistence';
import { useScrollToBottom } from '../hooks/useScrollToBottom';
import './ChatPage.css';

export function ChatPage() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const startNewOnMountRef = useRef(
    Boolean((location.state as { startNew?: boolean } | null)?.startNew)
  );
  const pendingNavSessionRef = useRef<string | null>(null);
  const {
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
  } = useChatSession({ startNewOnMount: startNewOnMountRef.current });
  const bottomRef = useScrollToBottom([messages, isLoading]);
  const [apiConfigured, setApiConfigured] = useState(true);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [confirmRestart, setConfirmRestart] = useState(false);
  const [mergePrompt, setMergePrompt] = useState(false);
  const [pendingHistoryId, setPendingHistoryId] = useState<string | null>(null);
  const [saveBeforeHistoryPrompt, setSaveBeforeHistoryPrompt] = useState(false);
  const [switchIncompletePrompt, setSwitchIncompletePrompt] = useState(false);

  useEffect(() => {
    void fetchHealth()
      .then((h) => {
        setApiConfigured(h.configured);
        setHealthError(null);
      })
      .catch((e) => {
        setApiConfigured(false);
        setHealthError(e instanceof Error ? e.message : 'Сервер недоступен.');
      });
  }, []);

  useEffect(() => {
    if (!user) return;
    const guest = loadGuestCache();
    if (guest && guest.messages.length > 0) {
      setMergePrompt(true);
    }
  }, [user?.id]);

  const handleRestart = () => {
    setConfirmRestart(false);
    void restart();
  };

  const handleMerge = async (save: boolean) => {
    setMergePrompt(false);
    if (save && user) {
      const guest = loadGuestCache();
      if (guest) await mergeGuestIntoAccount(user.id, guest);
      window.location.reload();
    }
  };

  const openHistorySessionById = useCallback(
    (sessionId: string) => {
      void (async () => {
        const plan = await planHistorySessionOpen(sessionId);
        switch (plan.action) {
          case 'prompt-save-before-view':
            setPendingHistoryId(plan.sessionId);
            setSaveBeforeHistoryPrompt(true);
            break;
          case 'prompt-switch-incomplete':
            setPendingHistoryId(plan.sessionId);
            setSwitchIncompletePrompt(true);
            break;
          case 'resume':
          case 'view':
            await openSessionFromHistory(plan.sessionId);
            break;
          case 'error':
            break;
        }
      })();
    },
    [planHistorySessionOpen, openSessionFromHistory]
  );

  useEffect(() => {
    const state = location.state as { openSessionId?: string; startNew?: boolean } | null;
    if (state?.startNew) {
      navigate('/chat', { replace: true, state: state.openSessionId ? { openSessionId: state.openSessionId } : null });
      return;
    }
    const openSessionId = state?.openSessionId;
    if (!openSessionId) return;
    pendingNavSessionRef.current = openSessionId;
    navigate('/chat', { replace: true, state: null });
  }, [location.state, navigate]);

  useEffect(() => {
    if (isInitializing) return;
    const sessionId = pendingNavSessionRef.current;
    if (!sessionId) return;
    pendingNavSessionRef.current = null;
    openHistorySessionById(sessionId);
  }, [isInitializing, openHistorySessionById]);

  const handleSelectHistorySession = (sessionId: string) => {
    openHistorySessionById(sessionId);
  };

  const handleSaveBeforeHistory = () => {
    const id = pendingHistoryId;
    setSaveBeforeHistoryPrompt(false);
    setPendingHistoryId(null);
    if (id) void saveCurrentAndOpenHistory(id);
  };

  const handleSkipSaveBeforeHistory = () => {
    const id = pendingHistoryId;
    setSaveBeforeHistoryPrompt(false);
    setPendingHistoryId(null);
    if (id) void openSessionFromHistory(id);
  };

  const handleConfirmSwitchIncomplete = () => {
    const id = pendingHistoryId;
    setSwitchIncompletePrompt(false);
    setPendingHistoryId(null);
    if (id) void openSessionFromHistory(id);
  };

  if (isInitializing && !error) {
    return (
      <DotBackground>
        <div className="chat-page chat-page--loading page-enter">Загрузка…</div>
      </DotBackground>
    );
  }

  return (
    <DotBackground>
      <div className="chat-page page-enter">
        <ChatWindow
          messages={messages}
          meta={meta}
          isLoading={isLoading}
          bottomRef={bottomRef}
          onSend={(t) => void sendMessage(t)}
          onRestart={() => setConfirmRestart(true)}
          showRestart={meta.completed && !isHistoryView}
          apiConfigured={apiConfigured}
          error={error ?? healthError}
          errorRetryable={error ? errorRetryable : Boolean(healthError)}
          onRetry={() => void retry()}
          onSelectHistorySession={user ? handleSelectHistorySession : undefined}
          onDeleteHistorySession={user ? deleteHistorySession : undefined}
          inputDisabled={isHistoryView || isLoading || meta.completed}
        >
          {!apiConfigured && !healthError && <ApiSetupBanner />}
        </ChatWindow>
      </div>
      <ConfirmDialog
        open={confirmRestart}
        title="Пройти заново?"
        message="Начнётся новый диалог. Незавершённая переписка останется в истории — её можно продолжить позже."
        confirmLabel="Начать заново"
        onConfirm={handleRestart}
        onCancel={() => setConfirmRestart(false)}
      />
      <ConfirmDialog
        open={mergePrompt}
        title="Сохранить диалог?"
        message="У вас есть не сохранённый гостевой чат. Привязать его к аккаунту?"
        confirmLabel="Сохранить"
        onConfirm={() => void handleMerge(true)}
        onCancel={() => setMergePrompt(false)}
      />
      <ConfirmDialog
        open={saveBeforeHistoryPrompt}
        title="Сохранить диалог?"
        message="У вас открыт незавершённый опрос — он уже сохранён в аккаунте. Открыть выбранный результат? Текущий опрос можно продолжить из истории."
        confirmLabel="Открыть результат"
        cancelLabel="Остаться здесь"
        onConfirm={handleSaveBeforeHistory}
        onCancel={handleSkipSaveBeforeHistory}
      />
      <ConfirmDialog
        open={switchIncompletePrompt}
        title="Переключить диалог?"
        message="Открыть другой незавершённый опрос? Текущий диалог останется в истории — его можно продолжить позже."
        confirmLabel="Переключиться"
        cancelLabel="Отмена"
        onConfirm={handleConfirmSwitchIncomplete}
        onCancel={() => {
          setSwitchIncompletePrompt(false);
          setPendingHistoryId(null);
        }}
      />
    </DotBackground>
  );
}
