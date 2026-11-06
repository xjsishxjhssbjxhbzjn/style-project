import { LogIn, LogOut } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../context/AuthProvider';
import { AuthEmailForm } from './AuthEmailForm';
import './AuthStatus.css';

export function AuthStatus() {
  const { user, signOut, isConfigured } = useAuth();
  const [showForm, setShowForm] = useState(false);

  if (!isConfigured) return null;

  return (
    <div className="auth-status">
      {user ? (
        <>
          <span className="auth-status__email" title={user.email ?? ''}>
            {user.email}
          </span>
          <button
            type="button"
            className="auth-status__icon-btn"
            onClick={() => void signOut()}
            aria-label="Выйти"
          >
            <LogOut size={18} />
          </button>
        </>
      ) : (
        <button
          type="button"
          className="auth-status__icon-btn"
          onClick={() => setShowForm((v) => !v)}
          aria-label="Войти"
        >
          <LogIn size={18} />
        </button>
      )}
      {showForm && !user && <AuthEmailForm onClose={() => setShowForm(false)} />}
    </div>
  );
}
