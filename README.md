# RPG Gamifier v12 — Boss Battle + Mini Avatar
- Мини-аватар с эмоциями: 🙂 обычный, 😢 при пропуске daily, 🏆 при победе над боссом.
- Битва с боссом: урон = XP за задачу, настраиваемое имя и HP, награда при победе.
- Drag & Drop: перетаскивание задач из Inbox/Daily/Short/Boss между простыми списками.
- Напоминания: при добавлении задачи с датой фронтенд вызывает /register_reminder (нужен backend).
- GPT/советы: через /coach (если подключишь бэкенд).

## Настройки
В `index.html` установи:
```html
const BOT_API_BASE = "https://your-render-app.onrender.com"; // или оставь REPLACE для офлайна
```
