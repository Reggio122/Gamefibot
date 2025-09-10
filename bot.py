# RPG Gamifier v11 — Telegram Bot + Flask API + Reminders + GPT Coach
import os, json, time, threading
from datetime import datetime, timezone
from flask import Flask, request, jsonify
from telegram import Bot, InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
from telegram.ext import ApplicationBuilder, CommandHandler

TOKEN = os.getenv('BOT_TOKEN', 'YOUR_TELEGRAM_BOT_TOKEN')
MINIAPP_URL = os.getenv('MINIAPP_URL', 'https://your-gh-username.github.io/rpg-gamifier/')
DATA_FILE = 'data_v11.json'

USE_GPT = bool(os.getenv('OPENAI_API_KEY'))
try:
    if USE_GPT:
        import openai
        openai.api_key = os.getenv('OPENAI_API_KEY')
except Exception:
    USE_GPT = False

if os.path.exists(DATA_FILE):
    with open(DATA_FILE, 'r', encoding='utf-8') as f:
        DATA = json.load(f)
else:
    DATA = {'users':{}, 'reminders': []}  # reminders: [{chat_id, title, when_iso}]

def ensure_user(cid):
    cid = str(cid)
    if cid not in DATA['users']:
        DATA['users'][cid] = {"avatar":"hero1.png","stats":{"STR":0,"INT":0,"CHA":0},"xpLog":[],"tasks":[],"achievements":[]}
        save()
    return DATA['users'][cid]

def save():
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(DATA, f, ensure_ascii=False, indent=2)

app = Flask(__name__)
bot = Bot(TOKEN)

@app.route('/health')
def health(): return 'ok', 200

@app.post('/register_reminder')
def register_reminder():
    body = request.get_json() or {}
    chat_id = str(body.get('chat_id','default'))
    t = body.get('task') or {}
    when = t.get('when')
    if when:
        DATA['reminders'].append({'chat_id': chat_id, 'title': t.get('title'), 'when': when})
        save()
        return jsonify({"ok":True, "scheduled": when})
    return jsonify({"ok":False, "error":"no when"})

@app.post('/coach')
def coach():
    body = request.get_json() or {}
    level = body.get('level',1); stats = body.get('stats',{}); prompt = body.get('prompt', '')
    if USE_GPT:
        try:
            p = f"Ты коуч для начинающего контент-мейкера. Уровень {level}, статы {stats}. Пользователь просит: {prompt}. Дай 4 конкретных коротких задания на сегодня с намёком на XP."
            resp = openai.chat.completions.create(model="gpt-4o-mini", messages=[{"role":"user","content":p}], max_tokens=220)
            text = resp.choices[0].message.content
            ideas = [line.strip('-• ').strip() for line in text.split('\n') if line.strip()][:4]
            return jsonify({"ideas": ideas})
        except Exception as e:
            return jsonify({"ideas": []})
    return jsonify({"ideas": []})

# Simple reminder loop
def reminder_loop():
    while True:
        now = datetime.now(timezone.utc).timestamp()
        new_list = []
        for r in DATA.get('reminders', []):
            try:
                when_ts = datetime.fromisoformat(r['when'].replace('Z','+00:00')).timestamp()
            except Exception:
                when_ts = None
            if when_ts and when_ts <= now:
                try:
                    bot.send_message(int(r['chat_id']), text=f"⏰ Напоминание: {r['title']}")
                except Exception:
                    pass
            else:
                new_list.append(r)
        DATA['reminders'] = new_list
        save()
        time.sleep(30)

# Telegram
async def start_cmd(update, context):
    button = InlineKeyboardButton("Открыть RPG Gamifier", web_app=WebAppInfo(url=MINIAPP_URL))
    await update.message.reply_text("Добро пожаловать в гильдию! 🐉", reply_markup=InlineKeyboardMarkup([[button]]))

def run_bot():
    app_ = ApplicationBuilder().token(TOKEN).build()
    app_.add_handler(CommandHandler('start', start_cmd))
    threading.Thread(target=lambda: app.run(host="0.0.0.0", port=5000), daemon=True).start()
    threading.Thread(target=reminder_loop, daemon=True).start()
    app_.run_polling()

if __name__ == "__main__":
    run_bot()
