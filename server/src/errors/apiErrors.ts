import type { Response } from 'express';

const MESSAGES: Record<string, string> = {
  API_NOT_CONFIGURED:
    'Ключ Google AI Studio не настроен. Добавьте GEMINI_API_KEY в файл .env в корне проекта и перезапустите сервер.',
  RATE_LIMIT: 'Слишком много запросов. Подождите около минуты и попробуйте снова.',
  EMPTY_HISTORY: 'История сообщений пуста. Обновите страницу или начните диалог заново.',
  MESSAGE_TOO_LONG: 'Сообщение слишком длинное. Сократите текст до 4000 символов.',
  INVALID_JSON: 'Некорректный формат данных запроса.',
  UPSTREAM_ERROR: 'Сервис Google AI Studio вернул ошибку.',
  NOT_FOUND: 'Запрошенный API-метод не найден.',
};

export function errorMessage(code: string, detail?: string): string {
  const base = MESSAGES[code] ?? 'Произошла неизвестная ошибка.';
  if (detail?.trim()) {
    return `${base} ${detail.trim()}`;
  }
  return base;
}

export function sendError(res: Response, status: number, code: string, detail?: string) {
  res.status(status).json({
    error: code,
    message: errorMessage(code, detail),
  });
}

export function upstreamDetail(err: unknown): string | undefined {
  if (!(err instanceof Error)) return undefined;
  const msg = err.message.trim();
  if (!msg) return undefined;
  if (msg.length > 280) {
    return msg.slice(0, 277) + '…';
  }
  return msg;
}
