import './ApiSetupBanner.css';

export function ApiSetupBanner() {
  return (
    <div className="api-banner" role="alert">
      Для работы ассистента укажите ключ Google AI Studio (<code>GEMINI_API_KEY</code>) в файле{' '}
      <code>.env</code> в корне проекта и перезапустите сервер. Без ключа ответы ИИ недоступны.
    </div>
  );
}
