# Иначе

MVP веб-приложения для тренировки креативного мышления. Пользователь получает случайное слово, вводит минимум три нестандартных применения, отправляет идеи на проверку ИИ и видит историю со статистикой.

## Запуск

```bash
npm install
npm start
```

После запуска откройте:

```txt
http://localhost:3000
```

## Настройка ИИ

Скопируйте пример конфигурации и укажите провайдера:

```bash
cp config/config.example.json config/config.json
```

Поддерживаются провайдеры `openrouter` и `local`. API-ключ хранится только на backend и не попадает во frontend. Для деплоя удобно использовать переменные окружения:

```env
PORT=3000
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=your_key
OPENROUTER_MODEL=openai/gpt-4o-mini
```

Если ключ OpenRouter не задан или локальный AI недоступен, backend вернёт короткую fallback-оценку, чтобы MVP оставался работоспособным для демонстрации.

## API

- `GET /api/word` — случайное слово.
- `POST /api/check` — проверка идей и сохранение попытки.
- `POST /api/hint` — подсказка-направление.
- `GET /api/history` — история попыток.
- `GET /api/stats` — статистика по JSON-БД.

## Структура

```txt
frontend/          статичная страница MVP
backend/server.js  Express API и раздача frontend
backend/ai/        слой выбора AI-provider
backend/db/        JSON-БД и статистика
config/            конфигурация провайдеров
database/db.json   данные попыток
data/words.json    список слов
```
