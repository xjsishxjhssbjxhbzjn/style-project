# Узнай свой стиль

Интерактивный сайт с ИИ-консультантом по модным направлениям: адаптивный диалог, подбор до 5 стилей, Supabase для входа по email и истории чатов.

## Требования

- Node.js 18+
- API key [Google AI Studio](https://aistudio.google.com/apikey)
- Supabase project (опционально для облачного сохранения; без него работает гостевой режим через `localStorage`)

## Установка

```bash
npm install
cd client && npm install && cd ..
cd server && npm install && cd ..
```

Скопируйте `.env.example` в `.env` в корне проекта и заполните переменные.

## Supabase

1. Создайте проект на [supabase.com](https://supabase.com).
2. В SQL Editor выполните миграцию из [`supabase/migrations/001_chat_history.sql`](supabase/migrations/001_chat_history.sql).
3. Authentication → Providers → Email: включите email, при необходимости настройте OTP.
4. Authentication → URL Configuration: Site URL `http://localhost:5173`, Redirect URLs `http://localhost:5173/**`.
5. Скопируйте Project URL и anon key в `.env` как `VITE_SUPABASE_URL` и `VITE_SUPABASE_ANON_KEY`.

## Запуск

```bash
npm run dev
```

- Клиент: http://localhost:5173  
- API: http://localhost:3001  

## Production

```bash
npm run build
npm start
```

Express раздаёт собранный клиент из `client/dist` и обрабатывает `/api/*`.

## Переменные окружения

| Переменная | Описание |
|------------|----------|
| `GEMINI_API_KEY` | Ключ Google AI Studio (обязателен для ИИ). Альias: `GOOGLE_AI_API_KEY` |
| `GEMINI_MODEL` | Модель Gemini, по умолчанию `gemini-3.5-flash-lite` |
| `PORT` | Порт сервера, по умолчанию `3001` |
| `CLIENT_ORIGIN` | Origin для CORS |
| `VITE_SUPABASE_URL` | URL Supabase |
| `VITE_SUPABASE_ANON_KEY` | Anon key Supabase |
