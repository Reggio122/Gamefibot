// === v10 Solo Leveling Lite ===
const STORAGE_KEY="rpg_v10_state";
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
  daily:{date:todayKey(), missed:false}
};

let state = load() || seed();

function load(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY));}catch(e){return null}}
function save(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state))}

function seed(){
  const s=JSON.parse(JSON.stringify(defaultState));
  // sample chains for mid/long
  s.tasks.mid=[
    {id:genId(), title:"Записать подкаст", XP:30, stat:"CHA", done:false, subs:[
      {id:genId(), title:"Подготовить план", XP:10, stat:"INT", done:false},
      {id:genId(), title:"Запись 20 минут", XP:10, stat:"CHA", done:false},
      {id:genId(), title:"Лёгкая чистка звука", XP:10, stat:"INT", done:false},
    ]},
    {id:genId(), title:"Смонтировать видео", XP:30, stat:"INT", done:false, subs:[
      {id:genId(), title:"Отбор кадров", XP:10, stat:"INT", done:false},
      {id:genId(), title:"Черновой монтаж", XP:10, stat:"INT", done:false},
      {id:genId(), title:"Цвет/звук", XP:10, stat:"INT", done:false},
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
  s.tasks.short=[
    {id:genId(), title:"Читать 15 минут", XP:10, stat:"INT", done:false},
    {id:genId(), title:"Написать 200 слов", XP:10, stat:"INT", done:false},
    {id:genId(), title:"Пройти 1км", XP:10, stat:"STR", done:false},
    {id:genId(), title:"Написать 1 пост", XP:10, stat:"CHA", done:false}
  ];
  s.tasks.boss=[{id:genId(), title:"Первое миллионое видео", XP:1000, stat:"CHA", done:false}];
  // initial dailies
  s.tasks.daily = genDaily();
  return s;
}

function genDaily(){
  // 3 unique random short tasks (as daily)
  const picks=new Set(); while(picks.size<3){picks.add(rand(ideaPool));}
  return Array.from(picks).map(txt=>({id:genId(), title:txt.replace(/\s*\(\+.*\)$/, ''), XP:10, stat:"INT", done:false}));
}

function ensureDaily(){
  const today=todayKey();
  if(state.daily.date!==today){
    // check missed
    const allDone = state.tasks.daily.every(d=>d.done);
    state.daily.missed = !allDone;
    state.daily.date = today;
    state.tasks.daily = genDaily();
    save(); toast(state.daily.missed? "⚠️ Вчерашние ежедневные не закрыты":"☀️ Новый день — новые квесты!", state.daily.missed? 'warn':'success');
  }
}

function toast(text, kind='success'){
  const host=document.getElementById('toasts');
  const t=document.createElement('div'); t.className='toast '+(kind==='level'?'level':kind==='warn'?'warn':'success');
  t.textContent=text; host.appendChild(t);
  setTimeout(()=>{t.style.opacity='0'; t.style.transform='translateY(-8px)'; setTimeout(()=> host.removeChild(t), 250)}, 2000);
}

function addXP(amount, stat){
  state.xp += amount;
  state.stats[stat] = (state.stats[stat]||0) + Math.max(1, Math.round(amount/10));
  state.xpLog.unshift({ts:Date.now(), amount, note:'+XP'});
  // level up
  while(state.xp >= state.xpToLevel){
    state.xp -= state.xpToLevel; state.level++; state.xpToLevel = Math.round(state.xpToLevel*1.15);
    state.achievements.unshift({id:genId(), title:'LEVEL UP: '+state.level});
    toast("⚡ LEVEL UP! Вы стали сильнее!", 'level');
  }
}

function toggleSimple(bucket, id){
  const list=state.tasks[bucket]; const t=list.find(x=>x.id===id); if(!t) return;
  if(t.done){ t.done=false; save(); render(); return; }
  t.done=true; addXP(t.XP, t.stat);
  toast(`✅ Квест выполнен! +${t.XP} XP, +${t.stat}`,'success');
  save(); render();
}

function toggleSub(parentBucket, parentId, subId){
  const parent = state.tasks[parentBucket].find(x=>x.id===parentId); if(!parent) return;
  const sub = parent.subs.find(s=>s.id===subId); if(!sub) return;
  if(sub.done){ sub.done=false; save(); render(); return; }
  sub.done=true; addXP(sub.XP, sub.stat);
  toast(`✅ Подзадача выполнена! +${sub.XP} XP`,'success');
  // check parent completion
  if(parent.subs.every(s=>s.done) && !parent.done){
    parent.done=true;
    addXP(parent.XP, parent.stat);
    toast(`🏁 Цепочка завершена: ${parent.title} (+${parent.XP} XP)`,'success');
  }
  save(); render();
}

function chainRow(chain, bucket){
  const doneCount = chain.subs.filter(s=>s.done).length;
  const total = chain.subs.length;
  const pct = Math.round((doneCount/total)*100);
  const wrap=document.createElement('div'); wrap.className='chain'+(chain.open?' open':'');
  const title=document.createElement('div'); title.className='title'; title.innerHTML=`<strong>${chain.title}</strong><span class="meta">${doneCount}/${total}</span>`;
  title.onclick=()=>{ chain.open=!chain.open; save(); render(); };
  const bar=document.createElement('div'); bar.className='bar'; bar.innerHTML=`<div class="fill" style="width:${pct}%"></div>`;
  const subs=document.createElement('div'); subs.className='subs';
  chain.subs.forEach(s=>{
    const row=document.createElement('div'); row.className='sub'+(s.done?' done':'');
    row.innerHTML=`<div><input type="checkbox" ${s.done?'checked':''} onclick="toggleSub('${bucket}','${chain.id}','${s.id}')"> ${s.title} <span class="meta">+${s.XP} XP</span></div>`;
    subs.appendChild(row);
  });
  wrap.appendChild(title); wrap.appendChild(bar); wrap.appendChild(subs);
  return wrap;
}

// Render
function render(){
  ensureDaily();
  document.getElementById('avatarImg').src='assets/'+state.avatar;
  document.getElementById('statSTR').textContent=state.stats.STR;
  document.getElementById('statINT').textContent=state.stats.INT;
  document.getElementById('statCHA').textContent=state.stats.CHA;
  document.getElementById('levelNum').textContent=state.level;
  const bal = state.xpLog.reduce((s,l)=>s+l.amount,0); document.getElementById('currentXP').textContent=bal;
  document.getElementById('xpFill').style.width=Math.min(100, Math.round(state.xp/state.xpToLevel*100))+'%';
  // daily
  const warn = document.getElementById('dailyWarn'); warn.classList.toggle('hide', !state.daily.missed);
  const daily=document.getElementById('dailyList'); daily.innerHTML='';
  state.tasks.daily.forEach(t=>{
    const row=document.createElement('div'); row.className='item'+(t.done?' done':'');
    row.innerHTML=`<div><input type="checkbox" ${t.done?'checked':''} onclick="toggleSimple('daily','${t.id}')"> ${t.title}</div>`;
    daily.appendChild(row);
  });
  // inbox
  const inbox=document.getElementById('inboxList'); inbox.innerHTML='';
  state.tasks.inbox.forEach(t=>{
    const row=document.createElement('div'); row.className='item'+(t.done?' done':'');
    row.innerHTML=`<div><input type="checkbox" ${t.done?'checked':''} onclick="toggleSimple('inbox','${t.id}')"> ${t.title} <span class="meta">+${t.XP} XP</span></div>`;
    inbox.appendChild(row);
  });
  // short simple
  const mount=(id,bucket)=>{
    const root=document.getElementById(id); root.innerHTML='';
    state.tasks[bucket].forEach(t=>{
      const row=document.createElement('div'); row.className='item'+(t.done?' done':'');
      row.innerHTML=`<div><input type="checkbox" ${t.done?'checked':''} onclick="toggleSimple('${bucket}','${t.id}')"> ${t.title} <span class="meta">+${t.XP} XP</span></div>`;
      root.appendChild(row);
    });
  };
  mount('shortList','short'); mount('bossList','boss');
  // chains
  const mid=document.getElementById('midList'); mid.innerHTML=''; state.tasks.mid.forEach(c=> mid.appendChild(chainRow(c,'mid')));
  const lang=document.getElementById('longList'); lang.innerHTML=''; state.tasks.long.forEach(c=> lang.appendChild(chainRow(c,'long')));
}

// UI bindings
document.getElementById('avatarSelect').onchange=(e)=>{ state.avatar=e.target.value; save(); render(); };
document.getElementById('inboxAdd').onclick=()=>{
  const title=document.getElementById('inboxText').value.trim(); if(!title) return;
  const XP=+document.getElementById('inboxXP').value||10; const stat=document.getElementById('inboxStat').value||'INT';
  state.tasks.inbox.unshift({id:genId(), title, XP, stat, done:false}); save(); render();
};
document.getElementById('askCoach').onclick=()=>{
  const box=document.getElementById('coachIdeas'); box.innerHTML='';
  const picks=new Set(); while(picks.size<4){picks.add(Math.floor(Math.random()*ideaPool.length));}
  Array.from(picks).forEach(i=>{const d=document.createElement('div'); d.className='idea'; d.textContent=ideaPool[i]; box.appendChild(d); });
};
document.getElementById('addReward').onclick=()=>{
  const title=document.getElementById('addRewardText').value.trim(); const cost=+document.getElementById('addRewardCost').value||50;
  if(!title) return; state.rewards.unshift({id:genId(), title, cost, bought:false}); save(); render();
};
document.getElementById('addAch').onclick=()=>{
  const t=document.getElementById('addAchText').value.trim(); if(!t) return; state.achievements.unshift({id:genId(), title:t}); save(); render();
};

render();
