# RPG Gamifier v11 — Solo Leveling + Reminders + GPT

## Frontend (GitHub Pages)
- Ежедневные квесты, поп-апы, редактор подзадач (добавить/редактировать/удалять).
- Звуки: success/level/warn.
- Чтобы включить напоминания и GPT — укажи BOT_API_BASE в index.html на URL Render.

## Backend (Render)
- `bot.py` поднимает Flask API + бота.
- Переменные окружения:
  - BOT_TOKEN=123:ABC
  - MINIAPP_URL=https://username.github.io/rpg-gamifier/
  - OPENAI_API_KEY=sk-... (опционально)
- Эндпоинты:
  - POST /register_reminder {chat_id,title,when}
  - POST /coach {chat_id,prompt,level,stats}
  - /health

## Assets
- assets/success.wav, level.wav, warn.wav
