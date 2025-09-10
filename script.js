const tg = window.Telegram?.WebApp;
if (tg) tg.expand();

let xp = parseInt(localStorage.getItem("xp")) || 0;
let level = parseInt(localStorage.getItem("level")) || 1;
let achievements = JSON.parse(localStorage.getItem("achievements")) || [];

let tasks = [
  {task: "Сделать пост", XP: 10, done: false},
  {task: "Смонтировать ролик", XP: 30, done: false},
  {task: "Прочитать книгу", XP: 100, done: false}
];

let rewards = [
  {reward: "☕ Час отдыха", cost: 30},
  {reward: "🎬 Поход в кино", cost: 150},
  {reward: "🎧 Новый гаджет", cost: 500}
];

function renderTasks() {
  const container = document.getElementById("tasks");
  container.innerHTML = "";
  tasks.forEach((t, i) => {
    const div = document.createElement("div");
    div.className = "task";
    div.innerHTML = `<input type="checkbox" id="task${i}" ${t.done?"checked":""}/> ${t.task} (+${t.XP} XP)`;
    container.appendChild(div);
    document.getElementById(`task${i}`).addEventListener("change", () => {
      if(!t.done){
        t.done = true;
        xp += t.XP;
        checkAchievements();
        saveData();
        updateXP();
      }
    });
  });
}

function renderRewards(){
  const container = document.getElementById("rewards");
  container.innerHTML = "";
  rewards.forEach((r, i) => {
    const div = document.createElement("div");
    div.className = "reward";
    const disabled = xp < r.cost ? "disabled" : "";
    div.innerHTML = `${r.reward} (${r.cost} XP) <button class="buy" ${disabled} id="reward${i}">Купить</button>`;
    container.appendChild(div);
    document.getElementById(`reward${i}`).addEventListener("click", () => {
      if(xp >= r.cost){
        xp -= r.cost;
        alert(`✅ Куплено: ${r.reward}`);
        saveData();
        updateXP();
      }
    });
  });
}

function updateXP(){
  document.getElementById("xp").innerText = xp;
  let maxXP = level * 100;
  if (xp >= maxXP) {
    xp -= maxXP;
    level++;
    alert(`🎉 Новый уровень: ${level}`);
  }
  document.getElementById("level").innerText = level;
  const progress = document.getElementById("progress");
  progress.style.width = (xp / (level * 100)) * 100 + "%";
  renderRewards();
}

function checkAchievements(){
  if(xp >= 100 && !achievements.includes("💯 XP!")){
    achievements.push("💯 XP!");
    alert("🥇 Получена ачивка: 💯 XP!");
  }
  if(tasks.every(t => t.done) && !achievements.includes("Все задачи выполнены!")){
    achievements.push("Все задачи выполнены!");
    alert("🏆 Получена ачивка: Все задачи выполнены!");
  }
  renderAchievements();
}

function renderAchievements(){
  const list = document.getElementById("achievements");
  list.innerHTML = "";
  achievements.forEach(a => {
    const li = document.createElement("li");
    li.innerText = a;
    list.appendChild(li);
  });
}

function saveData(){
  localStorage.setItem("xp", xp);
  localStorage.setItem("level", level);
  localStorage.setItem("achievements", JSON.stringify(achievements));
}

renderTasks();
renderRewards();
renderAchievements();
updateXP();