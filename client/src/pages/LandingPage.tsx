import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthStatus } from '../components/AuthStatus';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { DotBackground } from '../components/DotBackground';
import { useAuth } from '../context/AuthProvider';
import {
  archiveGuestDraft,
  discardInProgressDraft,
  hasInProgressDraft,
  hasGuestDraft,
} from '../hooks/useChatPersistence';
import './LandingPage.css';

export function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [saveDraftPrompt, setSaveDraftPrompt] = useState(false);
  const [checkingStart, setCheckingStart] = useState(false);

  const goNewSurvey = () => {
    navigate('/chat', { state: { startNew: true } });
  };

  const handleStartSurvey = () => {
    void (async () => {
      setCheckingStart(true);
      try {
        const draft = await hasInProgressDraft(user?.id ?? null);
        if (draft) {
          setSaveDraftPrompt(true);
        } else {
          goNewSurvey();
        }
      } finally {
        setCheckingStart(false);
      }
    })();
  };

  const handleSaveDraftAndStart = () => {
    setSaveDraftPrompt(false);
    if (!user && hasGuestDraft()) {
      archiveGuestDraft();
    }
    goNewSurvey();
  };

  const handleDiscardDraftAndStart = () => {
    setSaveDraftPrompt(false);
    void (async () => {
      await discardInProgressDraft(user?.id ?? null);
      goNewSurvey();
    })();
  };

  return (
    <DotBackground>
      <header className="landing__header">
        <AuthStatus />
      </header>
      <main className="landing page-enter">
        <h1 className="landing-title">Узнай свой стиль</h1>
        <div className="landing__actions">
          <button
            type="button"
            className="landing-button landing__start"
            disabled={checkingStart}
            onClick={handleStartSurvey}
          >
            Начать опрос
          </button>
          <button
            type="button"
            className="landing-button landing__start"
            onClick={() => navigate('/random-style')}
          >
            Случайный стиль
          </button>
        </div>
      </main>
      <ConfirmDialog
        open={saveDraftPrompt}
        title="Сохранить диалог?"
        message={
          user
            ? 'Есть незавершённый опрос. Сохранить его в истории и начать новый?'
            : 'Есть незавершённый опрос. Сохранить его и начать новый? (без входа черновик останется только в этом браузере).'
        }
        confirmLabel="Сохранить"
        cancelLabel="Не сохранять"
        onConfirm={handleSaveDraftAndStart}
        onCancel={handleDiscardDraftAndStart}
      />
    </DotBackground>
  );
}
