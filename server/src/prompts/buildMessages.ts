import type { Content } from '@google/generative-ai';

export type ChatTurn = { role: 'user' | 'assistant'; content: string };

const INIT_USER =
  '[SYSTEM: Начни диалог. Поприветствуй пользователя и задай первый вопрос о его предпочтениях в одежде.]';

export function buildGeminiContents(history: ChatTurn[], init: boolean): Content[] {
  if (init && history.length === 0) {
    return [{ role: 'user', parts: [{ text: INIT_USER }] }];
  }

  return history.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));
}

export function buildRetryContents(prevCount: number, previousRaw: string): Content[] {
  return [
    { role: 'model', parts: [{ text: previousRaw }] },
    {
      role: 'user',
      parts: [
        {
          text: `ВНИМАНИЕ: Содержательных ответов только ${prevCount}. Нельзя выдавать итоговый подбор стилей. Продолжай интервью одним новым вопросом. META: phase must be "interview".`,
        },
      ],
    },
  ];
}

export function buildEmptyVisibleTextRetryContents(previousRaw: string): Content[] {
  return [
    { role: 'model', parts: [{ text: previousRaw }] },
    {
      role: 'user',
      parts: [
        {
          text:
            'Ошибка формата: пользователь не должен видеть пустое сообщение. ' +
            'Напиши заново по-русски: короткая поддерживающая реакция на последний ответ и один новый вопрос с примерами. ' +
            'Перед блоком META обязательно должен быть видимый текст (не только META/RESULTS). ' +
            'Не увеличивай substantiveAnswerCount, если последний ответ был неопределённым («не знаю», «без разницы» и т.п.).',
        },
      ],
    },
  ];
}
