// RPG Gamifier — v17 Subtasks + Avatar (no backend)
const STORAGE='rpg_solo_state_v17';
let state = migrate(load()) || seed();

function seed(){
  return {
    lv:1, xp:0, xpReq:100, gold:0,
    tasks:{inbox:[], short:[], mid:[], long:[], boss:[]},
    rewards:[{id:id(), title:'🍫 Сладость', cost:30, bought:false},{id:id(), title:'🎮 30 мин игры', cost:80, bought:false},{id:id(), title:'📕 Новая книга', cost:200, bought:false}],
    logs:{xp:[], gold:[], done:[]},
    streaks:{}
  };
}
function migrate(prev){
  if(!prev) return null;
  // Обеспечиваем наличие subtasks и полей в задачах
  ['inbox','short','mid','long','boss'].forEach(b=>{
    (prev.tasks?.[b]||[]).forEach(t=>{
      if(!t.subtasks) t.subtasks=[];
      if(typeof t.xp!=='number') t.xp=10;
      if(typeof t.gold!=='number') t.gold=5;
      if(typeof t.done!=='boolean') t.done=false;
    });
  });
  // Переводим в новый storage ключ
  localStorage.removeItem('rpg_solo_state_v16');
  return prev;
}
function load(){ try{return JSON.parse(localStorage.getItem(STORAGE)) || JSON.parse(localStorage.getItem('rpg_solo_state_v16'))}catch(e){return null} }
function save(){ localStorage.setItem(STORAGE, JSON.stringify(state)) }
function id(){ return 'id'+Math.random().toString(36).slice(2,9) }
function $(q){ return document.querySelector(q) }
function today(){ return new Date().toISOString().slice(0,10) }
function isNextDay(prev, curr){ const a=new Date(prev), b=new Date(curr); const d=(b-a)/(1000*60*60*24); return d>=1 && d<2 }
function isNextWeek(prev, curr){ const a=new Date(prev), b=new Date(curr); const d=(b-a)/(1000*60*60*24); return d>=7 && d<14 }

// Tabs
document.querySelectorAll('.tab').forEach(btn=>btn.onclick=()=>{
  document.querySelectorAll('.tab').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('.pane').forEach(p=>p.classList.remove('active'));
  btn.classList.add('active');
  $('#tab-'+btn.dataset.tab).classList.add('active');
  if(btn.dataset.tab==='analytics') drawCharts();
});

// Add Task
$('#add').onclick = ()=>{
  const title = $('#title').value.trim(); if(!title) return;
  const bucket = $('#bucket').value;
  const xp = +$('#xpField').value||0;
  const gold = +$('#goldField').value||0;
  const whenVal = $('#whenField').value;
  const when = whenVal ? new Date(whenVal).toISOString() : null;
  const repeat = $('#repeatField').value||'';
  const t={id:id(), title, xp, gold, when, repeat, done:false, createdAt:Date.now(), subtasks:[]};
  (state.tasks[bucket]||state.tasks.inbox).unshift(t);
  save(); render();
  $('#title').value='';
};

// Render lists
function renderList(rootId, bucket){
  const root = document.getElementById(rootId); root.innerHTML='';
  (state.tasks[bucket]||[]).forEach(t=>{
    const hasSubs = t.subtasks && t.subtasks.length>0;
    const subDone = hasSubs ? t.subtasks.filter(s=>s.done).length : 0;
    const progress = hasSubs ? Math.round((subDone / t.subtasks.length)*100) : (t.done?100:0);
    const badges=[];
    if(t.repeat){ const s=getStreak(t.id); if(s.count>0) badges.push(`<span class="streak">🔥 ${s.count}d</span>`); }
    if(t.when) badges.push(`<span class="due">⏰</span>`);

    const el = document.createElement('div'); el.className='item'+(t.done?' done':'');
    el.draggable=true;
    el.addEventListener('dragstart',ev=>ev.dataTransfer.setData('text/plain', JSON.stringify({id:t.id, from:bucket})));

    el.innerHTML = `
      <div class="item-head">
        <div class="kv">
          <input type="checkbox" ${t.done?'checked':''} ${hasSubs?'disabled':''} onclick="toggle('${bucket}','${t.id}')">
          <div>${t.title} <span class="badge">+${t.xp} XP • +${t.gold} зол.</span> ${badges.join('')}</div>
        </div>
        <div class="item-controls">
          ${hasSubs?`<div class="progress" title="${progress}%"><i style="width:${progress}%"></i></div>`:''}
          <button class="btn" onclick="openEditor('${bucket}','${t.id}')">✏️</button>
          <button class="btn" onclick="toInbox('${bucket}','${t.id}')" title="В Inbox">↩</button>
          <button class="btn ghost" onclick="delTask('${bucket}','${t.id}')" title="Удалить">✖</button>
        </div>
      </div>
      <div id="ed-${t.id}" class="subtasks" style="display:none"></div>
    `;
    root.appendChild(el);
  });
}

function enableDropzones(){
  document.querySelectorAll('.droptarget').forEach(zone=>{
    zone.addEventListener('dragover', e=>{e.preventDefault(); zone.classList.add('over')});
    zone.addEventListener('dragleave', ()=> zone.classList.remove('over'));
    zone.addEventListener('drop', e=>{
      e.preventDefault(); zone.classList.remove('over');
      try{
        const data = JSON.parse(e.dataTransfer.getData('text/plain'));
        moveTask(data.id, data.from, zone.dataset.bucket);
      }catch(_){}
    });
  });
}

function moveTask(id, from, to){
  if(from===to) return;
  const src = state.tasks[from]; const i = src.findIndex(x=>x.id===id); if(i===-1) return;
  const [it] = src.splice(i,1);
  state.tasks[to].unshift(it);
  save(); render();
}

function toInbox(from,id_){ moveTask(id_, from, 'inbox'); }
function delTask(bucket,id_){
  const list=state.tasks[bucket]; const i=list.findIndex(x=>x.id===id_);
  if(i>-1){ list.splice(i,1); delete state.streaks[id_]; save(); render(); }
}

// Complete logic + streaks
function toggle(bucket,id_){
  const list=state.tasks[bucket]; const t=list.find(x=>x.id===id_); if(!t) return;
  if(t.subtasks && t.subtasks.length>0) return; // управляется по подзадачам
  t.done = !t.done;
  if(t.done){ grantRewards(t); }
  save(); render();
}

function grantRewards(t){
  addXP(t.xp||0);
  addGold(t.gold||0);
  // streak
  if(t.repeat){
    const day = today();
    const s = state.streaks[t.id] || {count:0,lastDay:null};
    if(s.lastDay){
      if(t.repeat==='DAILY' && isNextDay(s.lastDay, day)) s.count++;
      else if(t.repeat==='WEEKLY' && isNextWeek(s.lastDay, day)) s.count++;
      else s.count = 1;
    } else s.count = 1;
    s.lastDay = day;
    state.streaks[t.id]=s;
  }
  state.logs.done.unshift({ts:Date.now(), bucket: findBucketOf(t.id) });
}

function findBucketOf(id_){
  for(const b of ['inbox','short','mid','long','boss']){
    if((state.tasks[b]||[]).some(x=>x.id===id_)) return b;
  }
  return 'inbox';
}

// XP/Gold/Levels
function addXP(n){ state.xp += n; state.logs.xp.unshift({ts:Date.now(),n}); while(state.xp >= state.xpReq){ state.xp -= state.xpReq; state.lv++; state.xpReq = Math.round(state.xpReq*1.2);} }
function addGold(n){ state.gold += n; state.logs.gold.unshift({ts:Date.now(),n}); }

// Subtasks editor
function openEditor(bucket,id_){
  const list=state.tasks[bucket]; const t=list.find(x=>x.id===id_); if(!t) return;
  const host = document.getElementById('ed-'+id_);
  if(host.style.display==='none'){ host.style.display='block'; } else { host.style.display='none'; return; }
  const has = t.subtasks && t.subtasks.length>0;
  const subDone = has ? t.subtasks.filter(s=>s.done).length : 0;
  const progress = has ? Math.round((subDone / t.subtasks.length)*100) : 0;

  host.innerHTML = `
    <div class="sub-row">
      <input id="subIn-${id_}" type="text" placeholder="Добавить подзадачу..." />
      <button class="btn" onclick="addSubtask('${bucket}','${id_}')">＋</button>
    </div>
    <div id="sublist-${id_}" class="list"></div>
  `;
  renderSubtasks(bucket,id_);
}

function addSubtask(bucket,id_){
  const inp = document.getElementById('subIn-'+id_); const title = (inp.value||'').trim(); if(!title) return;
  const t = getTask(bucket,id_); if(!t.subtasks) t.subtasks=[];
  t.subtasks.push({id:id(), title, done:false});
  inp.value=''; save(); renderSubtasks(bucket,id_); render();
}

function renderSubtasks(bucket,id_){
  const t = getTask(bucket,id_); const root = document.getElementById('sublist-'+id_); root.innerHTML='';
  (t.subtasks||[]).forEach(s=>{
    const el = document.createElement('div'); el.className='sub-row';
    el.innerHTML = `<input type="checkbox" ${s.done?'checked':''} onclick="toggleSub('${bucket}','${t.id}','${s.id}')"> <div style="flex:1">${s.title}</div> <button class="btn ghost" onclick="delSub('${bucket}','${t.id}','${s.id}')">✖</button>`;
    root.appendChild(el);
  });
}

function toggleSub(bucket,tid,sid){
  const t = getTask(bucket,tid); const s=t.subtasks.find(x=>x.id===sid); if(!s) return;
  s.done = !s.done;
  // если все подзадачи выполнены — завершаем родительскую
  if(t.subtasks.length>0 && t.subtasks.every(x=>x.done) && !t.done){
    t.done=true; grantRewards(t);
  }
  save(); renderSubtasks(bucket,tid); render();
}

function delSub(bucket,tid,sid){
  const t = getTask(bucket,tid); const i=t.subtasks.findIndex(x=>x.id===sid); if(i>-1) t.subtasks.splice(i,1);
  // если удалили все подзадачи — parent снова можно завершать вручную
  save(); renderSubtasks(bucket,tid); render();
}

function getTask(bucket,id_){ return (state.tasks[bucket]||[]).find(x=>x.id===id_) }

// Shop
document.getElementById('addReward').onclick=()=>{
  const title = document.getElementById('reTitle').value.trim(); if(!title) return;
  const cost = +document.getElementById('reCost').value||1;
  state.rewards.push({id:id(), title, cost, bought:false}); save(); render();
};
function renderShop(){
  const root = document.getElementById('shop'); root.innerHTML='';
  state.rewards.forEach(r=>{
    const el=document.createElement('div'); el.className='item';
    const can = state.gold >= r.cost && !r.bought;
    el.innerHTML = `<div>${r.title} <span class="badge">— ${r.cost} зол.</span></div>
      <button class="btn" ${can?'':'disabled'} onclick="buy('${r.id}')">${r.bought?'Куплено':'Купить'}</button>`;
    root.appendChild(el);
  });
}
function buy(id_){ const r=state.rewards.find(x=>x.id===id_); if(!r||r.bought) return; if(state.gold>=r.cost){ state.gold-=r.cost; r.bought=true; save(); render(); }}

// Analytics
let charts=false;
function drawCharts(){
  if(charts) return; charts=true;
  const byXP = aggregate(state.logs.xp);
  const byGold = aggregate(state.logs.gold);
  const byDone = aggregate(state.logs.done.map(x=>({ts:x.ts,n:1})));
  const labels = mergeLabels(byXP, byGold, byDone);
  new Chart(document.getElementById('chartXP'), {type:'line', data:{labels, datasets:[{label:'XP', data:labels.map(k=>byXP[k]||0)}]}});
  new Chart(document.getElementById('chartGold'), {type:'line', data:{labels, datasets:[{label:'Gold', data:labels.map(k=>byGold[k]||0)}]}});
  new Chart(document.getElementById('chartDone'), {type:'bar', data:{labels, datasets:[{label:'Задачи', data:labels.map(k=>byDone[k]||0)}]}});
}
function aggregate(arr){ const d={}; arr.forEach(x=>{ const day = new Date(x.ts).toISOString().slice(0,10); d[day]=(d[day]||0)+(x.n||0); }); return d; }
function mergeLabels(...maps){ const set=new Set(); maps.forEach(m=>Object.keys(m).forEach(k=>set.add(k))); return Array.from(set).sort(); }

// Avatar mood
function mood(){
  const todayKey = today();
  const doneToday = state.logs.done.filter(x=>new Date(x.ts).toISOString().slice(0,10)===todayKey).length;
  const streakTotal = Object.values(state.streaks||{}).reduce((m,s)=>Math.max(m, s.count||0), 0);
  let emoji='😐', title='Нейтрально';
  if(doneToday>=3) { emoji='😎'; title='В потоке'; }
  else if(doneToday>=1) { emoji='🙂'; title='Хороший старт'; }
  // если давно без дел
  const last = state.logs.done[0]?.ts || 0;
  if(last){
    const diffDays = (Date.now()-last)/(1000*60*60*24);
    if(diffDays>=2 && doneToday===0) { emoji='😴'; title='Пора размяться'; }
  }
  if(streakTotal>=5) { emoji='🔥'; title='Серия побед!'; }
  return {emoji, doneToday, streakTotal, title};
}

function render(){
  document.getElementById('lv').textContent = state.lv;
  document.getElementById('xp').textContent = state.xp;
  document.getElementById('xpReq').textContent = state.xpReq;
  document.getElementById('gold').textContent = state.gold;
  renderList('inbox','inbox');
  renderList('short','short');
  renderList('mid','mid');
  renderList('long','long');
  renderList('boss','boss');
  renderShop();
  enableDropzones();

  const m = mood();
  document.getElementById('ava-emoji').textContent = m.emoji;
  document.getElementById('doneToday').textContent = m.doneToday;
  document.getElementById('streakTotal').textContent = m.streakTotal;
  document.getElementById('avatar').title = m.title;
}

document.getElementById('reset').onclick=()=>{ if(confirm('Точно сбросить локальные данные?')){ localStorage.removeItem(STORAGE); location.reload(); } };

// XP/Gold logs helpers were above
render();

// expose
window.toggle=toggle; window.buy=buy; window.toInbox=toInbox; window.delTask=delTask;
window.openEditor=openEditor; window.addSubtask=addSubtask; window.toggleSub=toggleSub; window.delSub=delSub;
