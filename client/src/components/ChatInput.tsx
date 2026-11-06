import { ArrowRight } from 'lucide-react';
import { useState, type KeyboardEvent } from 'react';
import './ChatInput.css';

type Props = {
  onSend: (text: string) => void;
  disabled: boolean;
};

export function ChatInput({ onSend, disabled }: Props) {
  const [value, setValue] = useState('');

  const handleSend = () => {
    const t = value.trim();
    if (!t || disabled) return;
    onSend(t);
    setValue('');
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="chat-input-row">
      <textarea
        className="chat-input-row__field"
        placeholder="Напишите свой ответ…"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKeyDown}
        disabled={disabled}
        rows={2}
      />
      <button
        type="button"
        className="chat-input-row__send"
        onClick={handleSend}
        disabled={disabled || !value.trim()}
        aria-label="Отправить"
      >
        <ArrowRight color="#fff" size={22} strokeWidth={2.5} />
      </button>
    </div>
  );
}
