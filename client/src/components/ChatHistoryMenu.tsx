import { History, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthProvider';
import { loadHistorySessions, type HistorySessionSummary } from '../hooks/useChatPersistence';
import { ConfirmDialog } from './ConfirmDialog';
import './ChatHistoryMenu.css';

type Props = {
  onSelectSession: (sessionId: string) => void;
  onSessionDeleted?: (sessionId: string) => Promise<boolean>;
};

export function ChatHistoryMenu({ onSelectSession, onSessionDeleted }: Props) {
  const { user, isConfigured } = useAuth();
  const [open, setOpen] = useState(false);
  const [sessions, setSessions] = useState<HistorySessionSummary[]>([]);
  const [listError, setListError] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const reloadSessions = useCallback(() => {
    if (!user) return;
    setListError(null);
    void loadHistorySessions(user.id)
      .then(setSessions)
      .catch((e) =>
        setListError(e instanceof Error ? e.message : 'Не удалось загрузить историю.')
      );
  }, [user]);

  useEffect(() => {
    if (!open || !user) return;
    reloadSessions();
  }, [open, user, reloadSessions]);

  if (!isConfigured || !user) return null;

  const handleSelect = (id: string) => {
    setOpen(false);
    onSelectSession(id);
  };

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeleteError(null);
    setPendingDeleteId(id);
  };

  const handleConfirmDelete = () => {
    const id = pendingDeleteId;
    setPendingDeleteId(null);
    if (!id || !onSessionDeleted) return;
    void (async () => {
      setDeleteError(null);
      const ok = await onSessionDeleted(id);
      if (ok) {
        setSessions((prev) => prev.filter((s) => s.id !== id));
      } else {
        setDeleteError('Не удалось удалить диалог.');
      }
    })();
  };

  const formatLabel = (s: HistorySessionSummary) => {
    const date = new Date(s.updated_at).toLocaleString('ru-RU');
    return s.completed ? date : `Продолжить опрос · ${date}`;
  };

  return (
    <div className="history-menu">
      <button
        type="button"
        className="history-menu__toggle"
        onClick={() => setOpen((v) => !v)}
        aria-label="Прошлые результаты"
      >
        <History size={18} />
      </button>
      {open && (
        <div className="history-menu__panel">
          <p className="history-menu__title">История диалогов</p>
          {listError && (
            <p className="history-menu__empty" role="alert">
              {listError}
            </p>
          )}
          {deleteError && (
            <p className="history-menu__empty history-menu__delete-error" role="alert">
              {deleteError}
            </p>
          )}
          {!listError && sessions.length === 0 && (
            <p className="history-menu__empty">Пока нет сохранённых диалогов.</p>
          )}
          <ul className="history-menu__list">
            {sessions.map((s) => (
              <li key={s.id} className="history-menu__row">
                <button
                  type="button"
                  className={
                    s.completed
                      ? 'history-menu__item'
                      : 'history-menu__item history-menu__item--draft'
                  }
                  onClick={() => handleSelect(s.id)}
                >
                  {formatLabel(s)}
                </button>
                <button
                  type="button"
                  className="history-menu__delete"
                  aria-label="Удалить диалог"
                  onClick={(e) => handleDeleteClick(e, s.id)}
                >
                  <Trash2 size={15} strokeWidth={2} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <ConfirmDialog
        open={pendingDeleteId !== null}
        title="Удалить диалог?"
        message="Вы точно хотите удалить?"
        confirmLabel="Да"
        cancelLabel="Нет"
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDeleteId(null)}
      />
    </div>
  );
}
