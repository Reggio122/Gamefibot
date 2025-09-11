// v15 Clean: XP+Gold, drag&drop, assistant stubs, analytics
const STORAGE="rpg_v15_state";
const state = load() || seed();

function seed(){
  return {
    lv:1, xp:0, xpReq:100, gold:0,
    tasks:{inbox:[], short:[], mid:[], long:[], boss:[]},
    rewards:[{id:id(), title:"🍫 Сладость", cost:30, bought:false}],
    logs:{xp:[], gold:[]}
  };
}
function load(){ try{ return JSON.parse(localStorage.getItem(STORAGE)); }catch(e){ return null; } }
function save(){ localStorage.setItem(STORAGE, JSON.stringify(state)); }

function id(){ return 'id'+Math.random().toString(36).slice(2,9); }
function $(q){ return document.querySelector(q); }

// Tabs
document.querySelectorAll('.tab').forEach(btn=>btn.onclick=()=>{
  document.querySelectorAll('.tab').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('.pane').forEach(p=>p.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('tab-'+btn.dataset.tab).classList.add('active');
  if(btn.dataset.tab==='analytics') drawCharts();
});

// Add task
$('#addTask').onclick=async ()=>{
  const title = $('#inTitle').value.trim(); if(!title) return;
  const XP = +$('#inXP').value||0;
  const GOLD = +$('#inGold').value||0;
  const whenVal = $('#inWhen').value; const when = whenVal? new Date(whenVal).toISOString(): null;
  const repeat = $('#inRepeat').value||'';
  const t={id:id(), title, XP, GOLD, when, repeat, done:false};
  state.tasks.inbox.unshift(t); save(); render();
  if(when) await api('/remind_smart', {chat_id:'default', task:t, repeat});
  $('#inTitle').value='';
};

// Render tasks
function renderList(rootId, bucket){
  const root = document.getElementById(rootId); root.innerHTML='';
  (state.tasks[bucket]||[]).forEach(t=>{
    const el = document.createElement('div'); el.className='item'+(t.done?' done':'');
    el.draggable=true; el.addEventListener('dragstart', ev=> ev.dataTransfer.setData('text/plain', JSON.stringify({id:t.id, from:bucket})));
    el.innerHTML = `<div>
      <input type="checkbox" ${t.done?'checked':''} onclick="toggle('${bucket}','${t.id}')">
      ${t.title} <span class="hint">+${t.XP} XP • +${t.GOLD} зол. ${t.when? '• ⏰':''}</span>
    </div>`;
    root.appendChild(el);
  });
}
function enableDropzones(){
  document.querySelectorAll('.droptarget').forEach(zone=>{
    zone.addEventListener('dragover', e=>{e.preventDefault(); zone.classList.add('over');});
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
  const [item] = src.splice(i,1); state.tasks[to].unshift(item); save(); render();
}

function toggle(bucket,id_){
  const list=state.tasks[bucket]; const t=list.find(x=>x.id===id_); if(!t) return;
  t.done = !t.done;
  if(t.done){ addXP(t.XP||0); addGold(t.GOLD||0); }
  save(); render();
}

function addXP(n){ state.xp += n; state.logs.xp.unshift({ts:Date.now(),n}); while(state.xp>=state.xpReq){ state.xp-=state.xpReq; state.lv++; state.xpReq=Math.round(state.xpReq*1.15);} }
function addGold(n){ state.gold += n; state.logs.gold.unshift({ts:Date.now(),n}); }

// Shop
function renderShop(){
  const root = document.getElementById('shop'); root.innerHTML='';
  state.rewards.forEach(r=>{
    const el = document.createElement('div'); el.className='item';
    const disabled = r.bought? 'disabled' : (state.gold<r.cost? 'disabled':'');
    el.innerHTML = `<div>${r.title} <span class="hint">— {r.cost} зол.</span></div>
      <button class="btn" ${disabled?'disabled':''} onclick="buy('${r.id}')">${r.bought? 'Куплено':'Купить'}</button>`;
    root.appendChild(el);
  });
}
function buy(id_){
  const r=state.rewards.find(x=>x.id===id_); if(!r || r.bought) return;
  if(state.gold>=r.cost){ state.gold-=r.cost; r.bought=true; save(); render(); }
}

// Assistant
async function runAssistant(mode){
  const text = ($('#aiText').value||'').trim();
  $('#aiOut').innerHTML = 'ИИ думает...';
  const res = await api('/assistant', {mode, text});
  const items = (res && res.items && res.items.length)? res.items : ['Написать 200 слов','Читать 15 минут','Прогулка 1 км'];
  const out = document.getElementById('aiOut'); out.innerHTML='';
  items.forEach(s=>{
    const el = document.createElement('div'); el.className='item';
    el.innerHTML = `<div>${s}</div><button class="btn">+ Inbox</button>`;
    el.querySelector('button').onclick = ()=>{ state.tasks.inbox.unshift({id:id(), title:s, XP:10, GOLD:5, done:false}); save(); render(); };
    out.appendChild(el);
  });
}
document.getElementById('aiBreak').onclick=()=> runAssistant('breakdown');
document.getElementById('aiWeek').onclick=()=> runAssistant('week');
document.getElementById('aiMotivate').onclick=()=> runAssistant('motivate');

// API helper
async function api(path, body){
  const el = document.getElementById('apiStatus');
  if(!window.BOT_API_BASE || String(window.BOT_API_BASE).includes('REPLACE')){ el.textContent='offline'; return null; }
  el.textContent='online';
  try{
    const r = await fetch(window.BOT_API_BASE+path, {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body||{})});
    return await r.json();
  }catch(e){ console.warn(e); return null; }
}

// Analytics
let charts=false;
function drawCharts(){
  if(charts) return; charts=true;
  const byDayXP = aggregate(state.logs.xp);
  const byDayGold = aggregate(state.logs.gold);
  const labels = Object.keys(byDayXP).sort();
  const xpData = labels.map(k=>byDayXP[k]||0);
  const gData = labels.map(k=>byDayGold[k]||0);
  new Chart(document.getElementById('chartXP'), {type:'line', data:{labels, datasets:[{label:'XP', data:xpData}]}});
  new Chart(document.getElementById('chartGold'), {type:'line', data:{labels, datasets:[{label:'Gold', data:gData}]}});
}
function aggregate(arr){
  const d={}; arr.forEach(x=>{ const day = new Date(x.ts).toISOString().slice(0,10); d[day]=(d[day]||0)+x.n; }); return d;
}

// Render UI
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
}
window.buy = buy;
window.toggle = toggle;
render();
