// RPG Gamifier — Solo Board (no backend). v16
const STORAGE='rpg_solo_state_v16';

const state = load() || seed();
function seed(){
  return {
    lv:1, xp:0, xpReq:100, gold:0,
    tasks:{inbox:[], short:[], mid:[], long:[], boss:[]},
    rewards:[
      {id:id(), title:'🍫 Сладость', cost:30, bought:false},
      {id:id(), title:'🎮 30 мин игры', cost:80, bought:false},
      {id:id(), title:'📕 Новая книга', cost:200, bought:false}
    ],
    logs:{xp:[], gold:[], done:[]},
    streaks:{} // taskId -> {count, lastDay:'YYYY-MM-DD'}
  };
}
function load(){ try{return JSON.parse(localStorage.getItem(STORAGE))}catch(e){return null} }
function save(){ localStorage.setItem(STORAGE, JSON.stringify(state)) }
function id(){ return 'id'+Math.random().toString(36).slice(2,9) }
function $(q){ return document.querySelector(q) }

// --- Tabs
document.querySelectorAll('.tab').forEach(btn=>btn.onclick=()=>{
  document.querySelectorAll('.tab').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('.pane').forEach(p=>p.classList.remove('active'));
  btn.classList.add('active');
  $('#tab-'+btn.dataset.tab).classList.add('active');
  if(btn.dataset.tab==='analytics') drawCharts();
});

// --- Add Task
$('#add').onclick = ()=>{
  const title = $('#title').value.trim(); if(!title) return;
  const bucket = $('#bucket').value;
  const xp = +$('#xpField').value||0;
  const gold = +$('#goldField').value||0;
  const whenVal = $('#whenField').value;
  const when = whenVal ? new Date(whenVal).toISOString() : null;
  const repeat = $('#repeatField').value||'';
  const t={id:id(), title, xp, gold, when, repeat, done:false, createdAt:Date.now()};
  (state.tasks[bucket]||state.tasks.inbox).unshift(t);
  save(); render();
  $('#title').value='';
};

// --- Render Lists
function renderList(rootId, bucket){
  const root = document.getElementById(rootId); root.innerHTML='';
  (state.tasks[bucket]||[]).forEach(t=>{
    const el = document.createElement('div');
    el.className='item'+(t.done?' done':'');
    el.draggable=true;
    el.addEventListener('dragstart',ev=>ev.dataTransfer.setData('text/plain', JSON.stringify({id:t.id, from:bucket})));
    const badges=[];
    if(t.repeat){ const s=getStreak(t.id); if(s.count>0) badges.push(`<span class="streak">🔥 ${s.count}d</span>`); }
    if(t.when) badges.push(`<span class="due">⏰</span>`);
    el.innerHTML = `<div class="kv">
      <input type="checkbox" ${t.done?'checked':''} onclick="toggle('${bucket}','${t.id}')">
      <div>${t.title} <span class="badge">+${t.xp} XP • +${t.gold} зол.</span></div>
      ${badges.join('')}
    </div>
    <div class="kv">
      <button class="btn" onclick="toInbox('${bucket}','${t.id}')" title="В Inbox">↩</button>
      <button class="btn ghost" onclick="delTask('${bucket}','${t.id}')" title="Удалить">✖</button>
    </div>`;
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
function toInbox(from,id_){
  moveTask(id_, from, 'inbox');
}
function delTask(bucket,id_){
  const list=state.tasks[bucket]; const i=list.findIndex(x=>x.id===id_);
  if(i>-1){ list.splice(i,1); delete state.streaks[id_]; save(); render(); }
}

// --- Complete logic
function toggle(bucket,id_){
  const list=state.tasks[bucket]; const t=list.find(x=>x.id===id_); if(!t) return;
  t.done = !t.done;
  if(t.done){
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
    state.logs.done.unshift({ts:Date.now(), bucket});
  }
  save(); render();
}
function today(){ return new Date().toISOString().slice(0,10) }
function isNextDay(prev, curr){ const a=new Date(prev), b=new Date(curr); return (b-a)/(1000*60*60*24) >= 1 && (b-a)/(1000*60*60*24) < 2 }
function isNextWeek(prev, curr){ const a=new Date(prev), b=new Date(curr); return (b-a)/(1000*60*60*24) >= 7 && (b-a)/(1000*60*60*24) < 14 }
function getStreak(id){ return state.streaks[id] || {count:0,lastDay:null} }

// --- XP/Gold/Levels
function addXP(n){
  state.xp += n; state.logs.xp.unshift({ts:Date.now(),n});
  while(state.xp >= state.xpReq){
    state.xp -= state.xpReq;
    state.lv++;
    state.xpReq = Math.round(state.xpReq*1.2);
  }
}
function addGold(n){ state.gold += n; state.logs.gold.unshift({ts:Date.now(),n}); }

// --- Shop
$('#addReward').onclick=()=>{
  const title = $('#reTitle').value.trim(); if(!title) return;
  const cost = +$('#reCost').value||1;
  state.rewards.push({id:id(), title, cost, bought:false}); save(); render();
};
function renderShop(){
  const root = $('#shop'); root.innerHTML='';
  state.rewards.forEach(r=>{
    const el = document.createElement('div'); el.className='item';
    const can = state.gold >= r.cost && !r.bought;
    el.innerHTML = `<div>${r.title} <span class="badge">— ${r.cost} зол.</span></div>
      <button class="btn" ${can?'':'disabled'} onclick="buy('${r.id}')">${r.bought?'Куплено':'Купить'}</button>`;
    root.appendChild(el);
  });
}
function buy(id_){
  const r = state.rewards.find(x=>x.id===id_); if(!r || r.bought) return;
  if(state.gold >= r.cost){ state.gold -= r.cost; r.bought = true; save(); render(); }
}

// --- Analytics
let charts=false;
function drawCharts(){
  if(charts) return; charts=true;
  // XP
  const byXP = aggregate(state.logs.xp);
  const byGold = aggregate(state.logs.gold);
  const byDone = aggregate(state.logs.done.map(x=>({ts:x.ts,n:1})));
  const labels = mergeLabels(byXP, byGold, byDone);
  new Chart($('#chartXP'), {type:'line', data:{labels, datasets:[{label:'XP', data:labels.map(k=>byXP[k]||0)}]}});
  new Chart($('#chartGold'), {type:'line', data:{labels, datasets:[{label:'Gold', data:labels.map(k=>byGold[k]||0)}]}});
  new Chart($('#chartDone'), {type:'bar', data:{labels, datasets:[{label:'Задачи', data:labels.map(k=>byDone[k]||0)}]}});
}
function aggregate(arr){
  const d={}; arr.forEach(x=>{ const day = new Date(x.ts).toISOString().slice(0,10); d[day]=(d[day]||0)+(x.n||0); }); return d;
}
function mergeLabels(...maps){
  const set=new Set(); maps.forEach(m=>Object.keys(m).forEach(k=>set.add(k))); return Array.from(set).sort();
}

// --- Render
function render(){
  $('#lv').textContent = state.lv;
  $('#xp').textContent = state.xp;
  $('#xpReq').textContent = state.xpReq;
  $('#gold').textContent = state.gold;
  renderList('inbox','inbox');
  renderList('short','short');
  renderList('mid','mid');
  renderList('long','long');
  renderList('boss','boss');
  renderShop();
  enableDropzones();
}
window.toggle=toggle; window.buy=buy; window.toInbox=toInbox; window.delTask=delTask;

$('#reset').onclick=()=>{ if(confirm('Точно сбросить локальные данные?')){ localStorage.removeItem(STORAGE); location.reload(); } };

render();
