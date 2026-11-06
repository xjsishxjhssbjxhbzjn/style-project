import { Home } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AuthStatus } from './AuthStatus';
import { ChatHistoryMenu } from './ChatHistoryMenu';
import './ChatWindow.css';

type Props = {
  onSelectHistorySession?: (sessionId: string) => void;
  onDeleteHistorySession?: (sessionId: string) => Promise<boolean>;
};

export function ChatPanelHeader({ onSelectHistorySession, onDeleteHistorySession }: Props) {
  return (
    <header className="chat-window__header">
      <div className="chat-window__header-left">
        <Link to="/" className="chat-window__home" aria-label="На главную">
          <Home size={18} />
        </Link>
        {onSelectHistorySession && (
          <ChatHistoryMenu
            onSelectSession={onSelectHistorySession}
            onSessionDeleted={onDeleteHistorySession}
          />
        )}
      </div>
      <AuthStatus />
    </header>
  );
}
