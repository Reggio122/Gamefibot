// App v3 - tasks, achievements, shop, level, archive - localStorage based
const STORAGE_KEY = "gamify_v3_data";

const defaultData = {
  xp:0,
  level:1,
  xpLog:[],
  tasks:{
    short:[],
    mid:[],
    long:[],
    boss:[],
    archive:[]
  },
  rewards:[],
  achievements:[]
};

function genId(){ return 'id'+Math.random().toString(36).slice(2,9) }
function saveState(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function loadState(){ const s = localStorage.getItem(STORAGE_KEY); return s?JSON.parse(s): null; }

let state = loadState();
if(!state){
  state = JSON.parse(JSON.stringify(defaultData));
  // seed with requested tasks
  state.tasks.short = [
    {id:genId(), title:"Читать 15 минут", XP:10, done:false},
    {id:genId(), title:"Написать 200 слов", XP:10, done:false},
    {id:genId(), title:"Пройти 1км", XP:10, done:false},
    {id:genId(), title:"Написать 1 пост", XP:10, done:false}
  ];
  state.tasks.mid = [
    {id:genId(), title:"Записать подкаст", XP:30, done:false},
    {id:genId(), title:"Смонтировать видео", XP:30, done:false},
    {id:genId(), title:"Смонтировать подкаст", XP:30, done:false}
  ];
  state.tasks.long = [
    {id:genId(), title:"Выложить видео по Героям Энвелла", XP:100, done:false},
    {id:genId(), title:"Выложить подкаст", XP:100, done:false}
  ];
  state.tasks.boss = [
    {id:genId(), title:"Первое миллионое видео", XP:1000, done:false}
  ];
  state.rewards = [
    {id:genId(), title:"🍫 Сладость", cost:20, bought:false},
    {id:genId(), title:"☕ Час отдыха", cost:30, bought:false},
    {id:genId(), title:"🎬 Поход в кино", cost:150, bought:false},
    {id:genId(), title:"🎧 Новый микрофон", cost:500, bought:false}
  ];
  saveState();
}

// add xp and log
function addXP(amount, note){
  state.xp += amount;
  state.xpLog.unshift({ts:Date.now(), amount, note});
  // level up
  while(state.xp >= state.level*100){
    state.xp -= state.level*100;
    state.level++;
    state.achievements.push({id:genId(), title:`Достиг уровень ${state.level}`, ts:Date.now()});
    alert('🎉 Новый уровень: ' + state.level);
  }
  saveState();
  renderAll();
}

function getBalance(){
  // total positive xp = sum of xpLog positive + remaining xp (state.xp)
  const positives = state.xpLog.filter(l=>l.amount>0).reduce((s,l)=>s+l.amount,0);
  const negatives = state.xpLog.filter(l=>l.amount<0).reduce((s,l)=>s+Math.abs(l.amount),0);
  return (positives - negatives) + state.xp; // approximate
}

function renderAll(){
  renderTasks(); renderShop(); renderAchievements(); renderLevel();
  document.getElementById('currentXP').innerText = Math.max(0, getBalance());
  document.getElementById('totalXP').innerText = Math.max(0, getBalance());
}

// task helpers
function createTaskCard(task, bucket){
  const el = document.createElement('div');
  el.className = 'task-card' + (task.done?' done':'');
  el.innerHTML = `<div><input type="checkbox" ${task.done?'checked':''} data-id="${task.id}" data-bucket="${bucket}" class="task-check"> <strong>${task.title}</strong> <span class="muted">(+${task.XP} XP)</span></div>
  <div><button class="btn-archive" data-id="${task.id}" data-bucket="${bucket}">📦</button> <button class="btn-delete" data-id="${task.id}" data-bucket="${bucket}">🗑</button></div>`;
  el.querySelector('.task-check').addEventListener('change', e=> {
    const id=e.target.dataset.id; const b=e.target.dataset.bucket;
    toggleDone(id,b);
  });
  el.querySelector('.btn-archive').addEventListener('click', ()=> archiveTask(task.id,bucket));
  el.querySelector('.btn-delete').addEventListener('click', ()=> deleteTask(task.id,bucket));
  return el;
}

function renderTasks(){
  ['short','mid','long','boss'].forEach(bucket=>{
    const container = document.getElementById(bucket+'List');
    container.innerHTML='';
    state.tasks[bucket].forEach(t=> container.appendChild(createTaskCard(t,bucket)));
  });
}

function toggleDone(id,bucket){
  const list = state.tasks[bucket];
  const t = list.find(x=>x.id===id);
  if(!t) return;
  if(t.done){ t.done=false; saveState(); renderAll(); return; }
  t.done=true;
  addXP(t.XP, 'Task: ' + t.title);
  saveState(); renderAll();
}

function archiveTask(id,bucket){
  const list = state.tasks[bucket]; const idx=list.findIndex(x=>x.id===id);
  if(idx===-1) return;
  const [it]=list.splice(idx,1); state.tasks.archive.unshift(it); saveState(); renderAll();
}
function deleteTask(id,bucket){ const list=state.tasks[bucket]; const i=list.findIndex(x=>x.id===id); if(i>-1) list.splice(i,1); saveState(); renderAll(); }

// shop
function renderShop(){
  const shopList=document.getElementById('shopList'); shopList.innerHTML='';
  state.rewards.forEach(r=>{
    const el=document.createElement('div'); el.className='reward-card';
    const can = getBalance() >= r.cost && !r.bought;
    el.innerHTML = `<div><strong>${r.title}</strong> <span class="muted">(${r.cost} XP)</span></div>
      <div><button ${can? '': 'disabled'} data-id="${r.id}" class="buy-btn">${r.bought?'✓':'Купить'}</button> <button class="del-reward" data-id="${r.id}">🗑</button></div>`;
    el.querySelector('.buy-btn').addEventListener('click', ()=> buyReward(r.id));
    el.querySelector('.del-reward').addEventListener('click', ()=> { deleteReward(r.id); });
    shopList.appendChild(el);
  });
  const hist=document.getElementById('purchaseHistory'); hist.innerHTML='';
  state.xpLog.slice(0,12).forEach(l=>{ const d=document.createElement('div'); d.className='archive-card'; d.innerText=new Date(l.ts).toLocaleString() + ' — ' + (l.amount>0?'+':'') + l.amount + ' XP — ' + (l.note||''); hist.appendChild(d); });
}

function buyReward(id){
  const r = state.rewards.find(x=>x.id===id); if(!r) return;
  if(getBalance() >= r.cost && !r.bought){
    r.bought=true; state.xpLog.unshift({ts:Date.now(), amount:-r.cost, note:'Bought: '+r.title}); state.achievements.push({id:genId(), title:'Купил: '+r.title, ts:Date.now()}); saveState(); renderAll();
    alert('Куплено: ' + r.title);
  } else alert('Недостаточно XP');
}
function deleteReward(id){ const i=state.rewards.findIndex(x=>x.id===id); if(i>-1) state.rewards.splice(i,1); saveState(); renderAll(); }

// achievements
function renderAchievements(){ const el=document.getElementById('achList'); el.innerHTML=''; state.achievements.forEach(a=>{ const c=document.createElement('div'); c.className='ach-card'; c.innerHTML=`<div>${a.title}</div><div><small class="muted">${a.ts?new Date(a.ts).toLocaleDateString():''}</small></div>`; el.appendChild(c); }); }

// level
function renderLevel(){ document.getElementById('levelNum').innerText = state.level; const prog=document.getElementById('levelProgress'); const pct = Math.round((state.xp / (state.level*100))*100); prog.style.width = Math.min(100,pct) + '%'; const xlog=document.getElementById('xpLog'); xlog.innerHTML=''; state.xpLog.forEach(l=>{ const d=document.createElement('div'); d.className='archive-card'; d.innerText=new Date(l.ts).toLocaleString() + ' — ' + (l.amount>0?'+':'') + l.amount + ' XP — ' + (l.note||''); xlog.appendChild(d); }); }

// add handlers
document.getElementById('addShort').addEventListener('click', ()=>{ addTask('short', document.getElementById('addShortText').value, document.getElementById('addShortXP').value); document.getElementById('addShortText').value=''; });
document.getElementById('addMid').addEventListener('click', ()=>{ addTask('mid', document.getElementById('addMidText').value, document.getElementById('addMidXP').value); document.getElementById('addMidText').value=''; });
document.getElementById('addLong').addEventListener('click', ()=>{ addTask('long', document.getElementById('addLongText').value, document.getElementById('addLongXP').value); document.getElementById('addLongText').value=''; });
document.getElementById('addBoss').addEventListener('click', ()=>{ addTask('boss', document.getElementById('addBossText').value, document.getElementById('addBossXP').value); document.getElementById('addBossText').value=''; });

document.getElementById('addReward').addEventListener('click', ()=>{ addReward(document.getElementById('addRewardText').value, document.getElementById('addRewardCost').value); document.getElementById('addRewardText').value=''; document.getElementById('addRewardCost').value='50'; });
document.getElementById('addAch').addEventListener('click', ()=>{ addAchievement(document.getElementById('addAchText').value); document.getElementById('addAchText').value=''; });

document.getElementById('openArchive').addEventListener('click', ()=>{ document.getElementById('archiveModal').classList.add('show'); renderArchive(); });
document.getElementById('closeArchive').addEventListener('click', ()=>{ document.getElementById('archiveModal').classList.remove('show'); });

document.getElementById('resetAll').addEventListener('click', ()=>{ if(confirm('Сбросить все данные?')){ localStorage.removeItem(STORAGE_KEY); location.reload(); } });

// archive render
function renderArchive(){ const el=document.getElementById('archiveList'); el.innerHTML=''; state.tasks.archive.forEach(a=>{ const c=document.createElement('div'); c.className='archive-card'; c.innerHTML=`<div>${a.title} (+${a.XP} XP)</div><div><button data-id="${a.id}" class="restore">↩</button></div>`; c.querySelector('.restore').addEventListener('click', ()=>{ state.tasks.archive = state.tasks.archive.filter(x=>x.id!==a.id); state.tasks.short.unshift(a); saveState(); renderAll(); renderArchive(); }); el.appendChild(c); }); }

// helper add functions
function addTask(bucket, title, xp){
  if(!title) return; state.tasks[bucket].unshift({id:genId(), title, XP: Number(xp)||10, done:false}); saveState(); renderAll();
}
function addReward(title, cost){ if(!title) return; state.rewards.unshift({id:genId(), title, cost: Number(cost)||50, bought:false}); saveState(); renderAll(); }
function addAchievement(title){ if(!title) return; state.achievements.unshift({id:genId(), title, ts:Date.now()}); saveState(); renderAll(); }

// init tabs
document.querySelectorAll('.tab').forEach(b=> b.addEventListener('click', ()=>{ document.querySelectorAll('.tab').forEach(tb=>tb.classList.remove('active')); b.classList.add('active'); document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active')); document.getElementById(b.dataset.tab).classList.add('active'); }));

// initial render
renderAll();
