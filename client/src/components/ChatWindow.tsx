import { RotateCcw } from 'lucide-react';
import type { ChatMessage, SessionMeta } from '../types/chat';
import { ChatPanelHeader } from './ChatPanelHeader';
import { ChatInput } from './ChatInput';
import { MessageList } from './MessageList';
import './ChatWindow.css';

type Props = {
  messages: ChatMessage[];
  meta: SessionMeta;
  isLoading: boolean;
  bottomRef: React.RefObject<HTMLDivElement | null>;
  onSend: (text: string) => void;
  onRestart: () => void;
  showRestart: boolean;
  apiConfigured: boolean;
  error: string | null;
  errorRetryable?: boolean;
  onRetry: () => void;
  onSelectHistorySession?: (sessionId: string) => void;
  onDeleteHistorySession?: (sessionId: string) => Promise<boolean>;
  inputDisabled?: boolean;
  children?: React.ReactNode;
};

export function ChatWindow({
  messages,
  meta,
  isLoading,
  bottomRef,
  onSend,
  onRestart,
  showRestart,
  error,
  errorRetryable = true,
  onRetry,
  onSelectHistorySession,
  onDeleteHistorySession,
  inputDisabled: inputDisabledProp,
  children,
}: Props) {
  const inputDisabled = inputDisabledProp ?? (isLoading || meta.completed);

  return (
    <div className="chat-window">
      <ChatPanelHeader
        onSelectHistorySession={onSelectHistorySession}
        onDeleteHistorySession={onDeleteHistorySession}
      />
      {children}
      <MessageList messages={messages} isLoading={isLoading} bottomRef={bottomRef} />
      {error && (
        <div className="chat-window__error" role="alert">
          <span className="chat-window__error-text">{error}</span>
          {errorRetryable && (
            <button type="button" onClick={onRetry}>
              Повторить
            </button>
          )}
        </div>
      )}
      {showRestart && (
        <button type="button" className="chat-window__restart" onClick={onRestart}>
          <RotateCcw size={16} />
          Пройти заново
        </button>
      )}
      <ChatInput onSend={onSend} disabled={inputDisabled} />
    </div>
  );
}
