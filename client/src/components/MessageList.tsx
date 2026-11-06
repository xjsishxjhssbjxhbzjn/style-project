import type { ChatMessage } from '../types/chat';
import { MessageBubble } from './MessageBubble';
import { TypingIndicator } from './TypingIndicator';
import './MessageList.css';

type Props = {
  messages: ChatMessage[];
  isLoading: boolean;
  bottomRef: React.RefObject<HTMLDivElement | null>;
};

export function MessageList({ messages, isLoading, bottomRef }: Props) {
  return (
    <div className="message-list">
      {messages.map((m) => (
        <MessageBubble key={m.id} role={m.role} content={m.content} images={m.images} />
      ))}
      {isLoading && <TypingIndicator />}
      <div ref={bottomRef} className="message-list__anchor" />
    </div>
  );
}
