Gamify v4 - Mini App + Bot

Files:
 - index.html
 - style.css
 - app.js
 - bot.py

Quick steps:
1) Host index.html/style.css/app.js on GitHub Pages/Netlify and note the public URL.
2) Edit bot.py: set TOKEN and MINIAPP_URL to your values.
3) Install deps: pip install python-telegram-bot==20.4 flask
4) Run bot: python bot.py (starts Flask on port 5000)
5) In Mini App (index.html) set BOT_API_BASE to your bot server (e.g. https://yourdomain.com)
6) Open bot in Telegram (/start) and use the Web App button.

Notes:
- For production use HTTPS and proper deployment (Railway, Heroku, VPS).
- The client uses localStorage; server stores per-user data in data_v4.json.
- For security, implement proper auth (e.g. pass chat_id from WebApp init data).
