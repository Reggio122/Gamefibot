// === v12 Boss Battle + Mini Avatar + Reminders ===
const STORAGE_KEY="rpg_v12_state";
const todayKey = ()=> new Date().toISOString().slice(0,10);
const rand = (a)=> a[Math.floor(Math.random()*a.length)];
const ideaPool=[
 "⚡ 15 минут чтения (+10 XP)","✍️ 200 слов (+10 XP)","🎥 30 минут монтажа (+20 XP)",
 "📣 Запланировать пост (+10 XP)","🏃 1 км прогулки (+10 XP)","🧹 Навести порядок 10 мин (+10 XP)",
 "🧠 1 упражнение для памяти (+10 XP)","🎧 1 образовательный подкаст (+10 XP)",
 "🗂 Разобрать одну папку (+10 XP)","📝 Скетч сценария (+15 XP)","📷 Сделать фото для поста (+10 XP)"
];

function genId(){return 'id'+Math.random().toString(36).slice(2,9)}

const defaultState={
  xp:0,level:1,xpToLevel:100,
  stats:{STR:0,INT:0,CHA:0},
  avatar:"hero1.png",
  tasks:{daily:[],inbox:[],short:[],mid:[],long:[],boss:[],archive:[]},
  rewards:[{id:genId(),title:"🍫 Сладость",cost:20,bought:false}],
  achievements:[{id:genId(),title:"Добро пожаловать!"}],
  xpLog:[],
  daily:{date:todayKey(), missed:false},
  boss:{name:"Дракон Из Эпоса", hp:1000, max:1000, defeated:false}
};

let state = load() || seed();

function load(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY));}catch(e){return null}}
function save(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state))}

function seed(){
  const s=JSON.parse(JSON.stringify(defaultState));
  s.tasks.short=[
    {id:genId(), title:"Читать 15 минут", XP:10, stat:"INT", when:null, done:false},
    {id:genId(), title:"Написать 200 слов", XP:10, stat:"INT", when:null, done:false},
    {id:genId(), title:"Пройти 1км", XP:10, stat:"STR", when:null, done:false},
    {id:genId(), title:"Написать 1 пост", XP:10, stat:"CHA", when:null, done:false}
  ];
  s.tasks.mid=[
    {id:genId(), title:"Записать подкаст", XP:30, stat:"CHA", done:false, subs:[
      {id:genId(), title:"Подготовить план", XP:10, stat:"INT", done:false},
      {id:genId(), title:"Запись 20 минут", XP:10, stat:"CHA", done:false},
      {id:genId(), title:"Чистка звука", XP:10, stat:"INT", done:false},
    ]},
  ];
  s.tasks.long=[
    {id:genId(), title:"Выложить видео по Героям Энвелла", XP:100, stat:"CHA", done:false, subs:[
      {id:genId(), title:"Исследование темы", XP:20, stat:"INT", done:false},
      {id:genId(), title:"Сценарий", XP:20, stat:"INT", done:false},
      {id:genId(), title:"Запись и монтаж", XP:40, stat:"INT", done:false},
      {id:genId(), title:"Обложка и описание", XP:20, stat:"CHA", done:false},
    ]},
  ];
  s.tasks.daily = genDaily();
  return s;
}

// Daily quests
function genDaily(){
  const picks=new Set(); while(picks.size<3){picks.add(rand(ideaPool));}
  return Array.from(picks).map(txt=>({id:genId(), title:txt.replace(/\s*\(\+.*\)$/, ''), XP:10, stat:"INT", done:false}));
}
function ensureDaily(){
  const today=todayKey();
  if(state.daily.date!==today){
    const allDone = state.tasks.daily.every(d=>d.done);
    state.daily.missed = !allDone;
    state.daily.date = today;
    state.tasks.daily = genDaily();
    save();
    toast(state.daily.missed? "⚠️ Вчерашние ежедневные не закрыты":"☀️ Новый день — новые квесты!", state.daily.missed? 'warn':'success');
  }
}

// API helper
async function api(path, body){
  const el = document.getElementById('apiStatus');
  if(!window.BOT_API_BASE || String(window.BOT_API_BASE).includes("REPLACE")){
    el.textContent='offline'; return null;
  }
  el.textContent='online';
  try{
    const res = await fetch(window.BOT_API_BASE + path, {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body||{})});
    return res.ok? res.json(): null;
  }catch(e){ console.warn(e); return null; }
}

// Toasts
function toast(text, kind='success'){
  const host=document.getElementById('toasts');
  const t=document.createElement('div'); t.className='toast '+(kind==='level'?'level':kind==='warn'?'warn':'success');
  t.textContent=text; host.appendChild(t);
  setTimeout(()=>{t.style.opacity='0'; t.style.transform='translateY(-8px)'; setTimeout(()=> host.removeChild(t), 250)}, 2200);
}

// XP / Level + Boss damage
function addXP(amount, stat){
  state.xp += amount;
  state.stats[stat] = (state.stats[stat]||0) + Math.max(1, Math.round(amount/10));
  state.xpLog.unshift({ts:Date.now(), amount, note:'+XP'});
  // damage boss
  if(!state.boss.defeated){
    state.boss.hp = Math.max(0, state.boss.hp - amount);
    if(state.boss.hp===0){
      state.boss.defeated = true;
      toast("🏆 Босс повержен! Получено +150 XP", 'level');
      state.xpLog.unshift({ts:Date.now(), amount:150, note:'Boss reward'});
    }
  }
  // level up
  while(state.xp >= state.xpToLevel){
    state.xp -= state.xpToLevel; state.level++; state.xpToLevel = Math.round(state.xpToLevel*1.15);
    state.achievements.unshift({id:genId(), title:'LEVEL UP: '+state.level});
    toast("⚡ LEVEL UP! Вы стали сильнее!", 'level');
  }
}

// Simple tasks
function toggleSimple(bucket, id){
  const list=state.tasks[bucket]; const t=list.find(x=>x.id===id); if(!t) return;
  if(t.done){ t.done=false; save(); render(); return; }
  t.done=true; addXP(t.XP, t.stat);
  toast(`✅ Квест выполнен! +${t.XP} XP, +${t.stat}`);
  save(); render();
}

// Chains
function toggleSub(parentBucket, parentId, subId){
  const parent = state.tasks[parentBucket].find(x=>x.id===parentId); if(!parent) return;
  const sub = parent.subs.find(s=>s.id===subId); if(!sub) return;
  if(sub.done){ sub.done=false; save(); render(); return; }
  sub.done=true; addXP(sub.XP, sub.stat);
  toast(`✅ Подзадача: +${sub.XP} XP`);
  if(parent.subs.every(s=>s.done) && !parent.done){
    parent.done=true; addXP(parent.XP, parent.stat); toast(`🏁 Цепочка завершена: ${parent.title} (+${parent.XP} XP)`);
  }
  save(); render();
}

// Drag & drop (Inbox + simple buckets)
function makeDraggable(el, payload){
  el.classList.add('draggable'); el.draggable=true;
  el.addEventListener('dragstart', e=>{
    e.dataTransfer.setData('text/plain', JSON.stringify(payload));
  });
}
function setupDroppable(listEl, targetBucket){
  listEl.addEventListener('dragover', e=>{ e.preventDefault(); listEl.classList.add('over'); });
  listEl.addEventListener('dragleave', ()=> listEl.classList.remove('over'));
  listEl.addEventListener('drop', e=>{
    e.preventDefault(); listEl.classList.remove('over');
    try{
      const data = JSON.parse(e.dataTransfer.getData('text/plain'));
      moveTask(data.id, data.from, targetBucket);
    }catch(err){}
  });
}
function moveTask(id, from, to){
  if(from===to) return;
  const src = state.tasks[from]; const idx = src.findIndex(x=>x.id===id); if(idx===-1) return;
  const [it] = src.splice(idx,1);
  // only simple tasks can go to simple buckets
  if(['short','boss','inbox','daily'].includes(to)){
    state.tasks[to].unshift(it);
  }else{
    // ignore for chains lists
    state.tasks[from].splice(idx,0,it);
  }
  save(); render();
}

// Reminder helper
async function scheduleReminder(task){
  if(!task.when) return;
  return api('/register_reminder', {chat_id:'default', task});
}

// Rendering
function chainRow(chain, bucket){
  const doneCount = chain.subs.filter(s=>s.done).length;
  const total = chain.subs.length;
  const pct = Math.round((doneCount/total)*100);
  const wrap=document.createElement('div'); wrap.className='chain'+(chain.open?' open':'');
  const title=document.createElement('div'); title.className='title';
  title.innerHTML=`<strong>${chain.title}</strong><span class="meta">${doneCount}/${total}</span>`;
  title.onclick=()=>{ chain.open=!chain.open; save(); render(); };
  const bar=document.createElement('div'); bar.className='bar'; bar.innerHTML=`<div class="fill" style="width:${pct}%"></div>`;
  const subs=document.createElement('div'); subs.className='subs';
  chain.subs.forEach(s=>{
    const row=document.createElement('div'); row.className='sub'+(s.done?' done':'');
    row.innerHTML=`<div>
       <input type="checkbox" ${s.done?'checked':''} onclick="toggleSub('${bucket}','${chain.id}','${s.id}')">
       ${s.title} <span class="meta">+${s.XP} XP • ${s.stat}</span></div>`;
    subs.appendChild(row);
  });
  wrap.appendChild(title); wrap.appendChild(bar); wrap.appendChild(subs);
  return wrap;
}

function render(){
  ensureDaily();
  // mood + avatar
  const avatar = document.getElementById('avatarImg');
  const mini = document.getElementById('miniAvatar');
  document.getElementById('avatarImg').src='assets/'+state.avatar;
  mini.src='assets/'+state.avatar;
  const mood = document.getElementById('mood');
  avatar.classList.remove('sad','heroic');
  if(state.daily.missed) { avatar.classList.add('sad'); mood.textContent='😢'; }
  else if(state.boss.defeated){ avatar.classList.add('heroic'); mood.textContent='🏆'; }
  else { mood.textContent='🙂'; }

  document.getElementById('statSTR').textContent=state.stats.STR;
  document.getElementById('statINT').textContent=state.stats.INT;
  document.getElementById('statCHA').textContent=state.stats.CHA;
  document.getElementById('levelNum').textContent=state.level;
  const bal = state.xpLog.reduce((s,l)=>s+l.amount,0); document.getElementById('currentXP').textContent=bal;
  document.getElementById('xpFill').style.width=Math.min(100, Math.round(state.xp/state.xpToLevel*100))+'%';
  // boss ui
  document.getElementById('bossName').textContent = state.boss.name;
  document.getElementById('bossHPText').textContent = `HP ${state.boss.hp} / ${state.boss.max}`;
  document.getElementById('bossHPFill').style.width = Math.max(0, Math.round((state.boss.hp/state.boss.max)*100))+'%';
  // daily
  const warn = document.getElementById('dailyWarn'); warn.classList.toggle('hide', !state.daily.missed);
  const daily=document.getElementById('dailyList'); daily.innerHTML='';
  state.tasks.daily.forEach(t=>{
    const row=document.createElement('div'); row.className='item draggable'+(t.done?' done':'');
    row.innerHTML=`<div><input type="checkbox" ${t.done?'checked':''} onclick="toggleSimple('daily','${t.id}')"> ${t.title}</div>`;
    daily.appendChild(row); makeDraggable(row, {id:t.id, from:'daily'});
  });
  // inbox
  const inbox=document.getElementById('inboxList'); inbox.innerHTML='';
  state.tasks.inbox.forEach(t=>{
    const when = t.when? new Date(t.when).toLocaleString(): '';
    const row=document.createElement('div'); row.className='item draggable'+(t.done?' done':'');
    row.innerHTML=`<div><input type="checkbox" ${t.done?'checked':''} onclick="toggleSimple('inbox','${t.id}')"> ${t.title} <span class="meta">+${t.XP} XP ${when? '• ⏰ '+when:''}</span></div>`;
    inbox.appendChild(row); makeDraggable(row, {id:t.id, from:'inbox'});
  });
  // short
  const mount=(id,bucket)=>{
    const root=document.getElementById(id); root.innerHTML='';
    state.tasks[bucket].forEach(t=>{
      const row=document.createElement('div'); row.className='item draggable'+(t.done?' done':'');
      row.innerHTML=`<div><input type="checkbox" ${t.done?'checked':''} onclick="toggleSimple('${bucket}','${t.id}')"> ${t.title} <span class="meta">+${t.XP} XP</span></div>`;
      root.appendChild(row); makeDraggable(row, {id:t.id, from:bucket});
    });
  };
  mount('shortList','short'); mount('bossList','boss');
  // chains
  const mid=document.getElementById('midList'); mid.innerHTML=''; state.tasks.mid.forEach(c=> mid.appendChild(chainRow(c,'mid')));
  const lang=document.getElementById('longList'); lang.innerHTML=''; state.tasks.long.forEach(c=> lang.appendChild(chainRow(c,'long')));

  // droppable zones
  document.querySelectorAll('.droppable').forEach(el=> setupDroppable(el, el.dataset.bucket));
}

// UI bindings
document.getElementById('avatarSelect').onchange=(e)=>{ state.avatar=e.target.value; save(); render(); };
document.getElementById('inboxAdd').onclick=async ()=>{
  const title=document.getElementById('inboxText').value.trim(); if(!title) return;
  const XP=+document.getElementById('inboxXP').value||10; const stat=document.getElementById('inboxStat').value||'INT';
  const whenVal=document.getElementById('inboxDate').value; const when = whenVal? new Date(whenVal).toISOString(): null;
  const t={id:genId(), title, XP, stat, done:false, when};
  state.tasks.inbox.unshift(t); save(); render();
  if(when) await scheduleReminder({title, XP, when});
};
document.getElementById('askCoach').onclick=async ()=>{
  const prompt = (document.getElementById('coachPrompt').value||'').trim();
  const box=document.getElementById('coachIdeas'); box.innerHTML='Мудрец размышляет…';
  const resp = await api('/coach', {chat_id:'default', prompt, level:state.level, stats:state.stats});
  if(resp && resp.ideas){ box.innerHTML=''; resp.ideas.slice(0,4).forEach(t=>{
      const d=document.createElement('div'); d.className='idea';
      d.textContent=t; d.onclick=()=>{ state.tasks.inbox.unshift({id:genId(), title:t, XP:10, stat:'INT', done:false}); save(); render(); };
      box.appendChild(d);
  }); }
  else { box.innerHTML=''; const picks=new Set(); while(picks.size<4){picks.add(Math.floor(Math.random()*ideaPool.length));}
         Array.from(picks).forEach(i=>{const d=document.createElement('div'); d.className='idea'; const txt=ideaPool[i];
           d.textContent=txt; d.onclick=()=>{ state.tasks.inbox.unshift({id:genId(), title:txt.replace(/\s*\(\+.*\)$/, ''), XP:10, stat:'INT', done:false}); save(); render(); };
           box.appendChild(d); }); }
};
document.getElementById('addReward').onclick=()=>{
  const title=document.getElementById('addRewardText').value.trim(); const cost=+document.getElementById('addRewardCost').value||50;
  if(!title) return; state.rewards.unshift({id:genId(), title, cost, bought:false}); save(); render();
};
document.getElementById('addAch').onclick=()=>{
  const t=document.getElementById('addAchText').value.trim(); if(!t) return; state.achievements.unshift({id:genId(), title:t}); save(); render();
};
document.getElementById('bossApply').onclick=()=>{
  const name=document.getElementById('bossNameInput').value.trim(); const max=parseInt(document.getElementById('bossHPMax').value,10)||state.boss.max;
  if(name) state.boss.name=name; state.boss.max=max; state.boss.hp = Math.min(state.boss.hp, max); state.boss.defeated = state.boss.hp<=0;
  save(); render();
};
document.getElementById('bossReset').onclick=()=>{ state.boss.hp = state.boss.max; state.boss.defeated=false; save(); render(); toast("🐲 Босс восстановил силы!","warn"); };

// Reminders
async function scheduleReminder(task){
  if(!task.when) return;
  return api('/register_reminder', {chat_id:'default', task});
}

render();
