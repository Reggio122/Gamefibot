# RPG Gamifier v5 — Mini App + Telegram Bot + GPT Coach (optional)

## Что внутри
- `index.html` / `style.css` / `app.js` — Mini App в стиле RPG (Inbox, доска квестов, магазин, ачивки, аватар, статы)
- `bot.py` — Телеграм-бот + Flask API: синк/напоминания, аватар, советчик (GPT-хук)
- `assets/hero1.png`, `assets/hero2.png`, `assets/hero3.png` — аватары (заглушки, замени на свои)

## Быстрый старт
1) Размести Mini App (index/style/app) на GitHub Pages / Netlify / Vercel.  
2) В `index.html` задай `BOT_API_BASE` — публичный URL твоего сервера, где крутится `bot.py`.  
3) Установи зависимости и запусти бота:
```
pip install python-telegram-bot==20.4 flask
# (опционально для советчика):
# pip install openai
# setx OPENAI_API_KEY sk-...  (Windows) / export OPENAI_API_KEY=... (macOS/Linux)
# setx BOT_TOKEN 123:ABC  / export BOT_TOKEN=...
python bot.py
```
4) В Telegram: `/start` → кнопка «Открыть RPG Gamifier».

## Команды
- `/start` — открыть Mini App
- `/add Название | XP | 2025-09-12T09:00` — добавить квест

## Примечания
- Для продакшена нужен HTTPS (Railway/Render/Heroku/VPS).
- Добавь авторизацию: используй `initData` WebApp, чтобы связать пользователя в Mini App и боте по chat_id.
- Файлы `assets/*.png` — заглушки 1×1, замени на свои спрайты/аватарки.
