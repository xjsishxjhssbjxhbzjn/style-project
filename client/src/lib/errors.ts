export type ApiErrorPayload = {
  error?: string;
  message?: string;
};

export class AppError extends Error {
  code: string;
  retryable: boolean;

  constructor(code: string, message: string, retryable = true) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.retryable = retryable;
  }
}

const CLIENT_MESSAGES: Record<string, string> = {
  API_NOT_CONFIGURED:
    'Ключ Google AI Studio не настроен. Добавьте GEMINI_API_KEY в .env и перезапустите сервер.',
  RATE_LIMIT: 'Слишком много запросов. Подождите минуту и попробуйте снова.',
  EMPTY_HISTORY: 'История пуста. Обновите страницу или нажмите «Пройти заново».',
  MESSAGE_TOO_LONG: 'Сообщение слишком длинное (максимум 4000 символов).',
  UPSTREAM_ERROR: 'Ошибка Google AI Studio.',
  REQUEST_FAILED: 'Запрос к серверу не выполнен.',
  NETWORK_ERROR:
    'Не удалось связаться с сервером. Убедитесь, что запущен npm run dev и порт API доступен.',
  HEALTH_CHECK_FAILED: 'Сервер не отвечает на проверку состояния (/api/health).',
  SUPABASE_NOT_CONFIGURED:
    'Supabase не настроен. Укажите VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY в .env.',
  PERSISTENCE_ERROR: 'Не удалось сохранить переписку в Supabase.',
  LOAD_SESSION_ERROR: 'Не удалось загрузить сохранённый диалог.',
};

export function messageForCode(code: string, serverMessage?: string): string {
  if (serverMessage?.trim()) return serverMessage.trim();
  return CLIENT_MESSAGES[code] ?? `Ошибка: ${code}`;
}

export function formatUnknownError(err: unknown): AppError {
  if (err instanceof AppError) return err;
  if (err instanceof TypeError && err.message.includes('fetch')) {
    return new AppError('NETWORK_ERROR', CLIENT_MESSAGES.NETWORK_ERROR);
  }
  if (err instanceof Error) {
    return new AppError('REQUEST_FAILED', err.message || CLIENT_MESSAGES.REQUEST_FAILED);
  }
  return new AppError('REQUEST_FAILED', CLIENT_MESSAGES.REQUEST_FAILED);
}

export async function parseApiResponse(res: Response): Promise<never> {
  let payload: ApiErrorPayload = {};
  try {
    payload = (await res.json()) as ApiErrorPayload;
  } catch {
    /* empty body */
  }
  const code = payload.error ?? `HTTP_${res.status}`;
  const message = messageForCode(code, payload.message);
  const retryable = code !== 'API_NOT_CONFIGURED' && code !== 'MESSAGE_TOO_LONG';
  throw new AppError(code, message, retryable);
}
