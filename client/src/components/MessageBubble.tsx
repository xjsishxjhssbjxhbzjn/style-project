import './MessageBubble.css';

type Props = {
  role: 'user' | 'assistant';
  content: string;
  images?: string[];
};

export function MessageBubble({ role, content, images }: Props) {
  return (
    <div className={`message-bubble message-bubble--${role}`}>
      <div className="message-bubble__text">{content}</div>
      {images && images.length > 0 && (
        <div className="message-bubble__images">
          {images.map((src) => (
            <img key={src} src={src} alt="" className="message-bubble__img" loading="lazy" />
          ))}
        </div>
      )}
    </div>
  );
}
