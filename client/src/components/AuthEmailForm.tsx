import { useState } from 'react';
import { useAuth } from '../context/AuthProvider';
import { messageForCode } from '../lib/errors';
import './AuthEmailForm.css';

type Props = {
  onClose: () => void;
};

export function AuthEmailForm({ onClose }: Props) {
  const { signInWithOtp, verifyOtp, isConfigured } = useAuth();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isConfigured) {
    return (
      <div className="auth-form">
        <p className="auth-form__hint" role="alert">
          {messageForCode('SUPABASE_NOT_CONFIGURED')}
        </p>
        <button type="button" className="auth-form__link" onClick={onClose}>
          Закрыть
        </button>
      </div>
    );
  }

  const sendCode = async () => {
    setLoading(true);
    setMessage(null);
    const res = await signInWithOtp(email.trim());
    setLoading(false);
    if (res.error) {
      setMessage(res.error);
      return;
    }
    setStep('code');
    setMessage('Код отправлен на почту.');
  };

  const confirmCode = async () => {
    setLoading(true);
    setMessage(null);
    const res = await verifyOtp(email.trim(), code.trim());
    setLoading(false);
    if (res.error) {
      setMessage(res.error);
      return;
    }
    onClose();
  };

  return (
    <div className="auth-form">
      {step === 'email' ? (
        <>
          <label className="auth-form__label">
            Email
            <input
              type="email"
              className="auth-form__input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </label>
          <button
            type="button"
            className="auth-form__submit"
            disabled={loading || !email.trim()}
            onClick={() => void sendCode()}
          >
            Получить код
          </button>
        </>
      ) : (
        <>
          <label className="auth-form__label">
            Код из письма
            <input
              type="text"
              className="auth-form__input"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
            />
          </label>
          <button
            type="button"
            className="auth-form__submit"
            disabled={loading || !code.trim()}
            onClick={() => void confirmCode()}
          >
            Войти
          </button>
          <button type="button" className="auth-form__link" onClick={() => setStep('email')}>
            Другой email
          </button>
        </>
      )}
      {message && <p className="auth-form__message">{message}</p>}
      <button type="button" className="auth-form__link" onClick={onClose}>
        Закрыть
      </button>
    </div>
  );
}
