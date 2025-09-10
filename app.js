// App v4 - Inbox + drag&drop + reminders integration (client-side)
// Configure BOT_API_BASE in index.html to point to your bot server when deployed.

const STORAGE_KEY = "gamify_v4_data";
function genId(){ return 'id'+Math.random().toString(36).slice(2,9) }
const defaultState = { xp:0, level:1, xpLog:[], tasks:{short:[], mid:[], long:[], boss:[], inbox:[], archive:[]}, rewards:[], achievements:[] };
let state = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') || defaultState;

// seed if empty
if(state.tasks.short.length===0 && state.tasks.mid.length===0 && state.tasks.long.length===0 && state.tasks.boss.length===0){
  state.tasks.short = [{id:genId(),title:"Читать 15 минут",XP:10,done:false,when:null},{id:genId(),title:"Написать 200 слов",XP:10,done:false,when:null},{id:genId(),title:"Пройти 1км",XP:10,done:false,when:null},{id:genId(),title:"Написать 1 пост",XP:10,done:false,when:null}];
  state.tasks.mid = [{id:genId(),title:"Записать подкаст",XP:30,done:false,when:null},{id:genId(),title:"Смонтировать видео",XP:30,done:false,when:null},{id:genId(),title:"Смонтировать подкаст",XP:30,done:false,when:null}];
  state.tasks.long = [{id:genId(),title:"Выложить видео по Героям Энвелла",XP:100,done:false,when:null},{id:genId(),title:"Выложить подкаст",XP:100,done:false,when:null}];
  state.tasks.boss = [{id:genId(),title:"Первое миллионое видео",XP:1000,done:false,when:null}];
  state.rewards = [{id:genId(),title:"🍫 Сладость",cost:20,bought:false},{id:genId(),title:"☕ Час отдыха",cost:30,bought:false},{id:genId(),title:"🎬 Поход в кино",cost:150,bought:false},{id:genId(),title:"🎧 Новый микрофон",cost:500,bought:false}];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function saveState(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function renderAll(){ renderInbox(); renderBuckets(); renderShop(); renderAchievements(); renderLevel(); document.getElementById('currentXP').innerText = getBalance(); }

function createTaskElement(t,bucket){
  const el = document.createElement('div'); el.className='task-card'+(t.done?' done':'');
  el.draggable = true; el.dataset.id = t.id; el.dataset.bucket = bucket;
  el.innerHTML = `<div><input type="checkbox" ${t.done?'checked':''} class="check"> <strong>${t.title}</strong> <small class="muted">(+${t.XP} XP)</small>${t.when?(' <small>⏰ '+new Date(t.when).toLocaleString()+'</small>'):''}</div><div><button class="btn-archive">📦</button> <button class="btn-delete">🗑</button></div>`;
  el.querySelector('.check').addEventListener('change', ()=> toggleDone(t.id,bucket));
  el.querySelector('.btn-archive').addEventListener('click', ()=> archiveTask(t.id,bucket));
  el.querySelector('.btn-delete').addEventListener('click', ()=> deleteTask(t.id,bucket));
  el.addEventListener('dragstart', e=> { el.classList.add('dragging'); e.dataTransfer.setData('text/plain', JSON.stringify({id:t.id, bucket})); });
  el.addEventListener('dragend', e=> { el.classList.remove('dragging'); });
  return el;
}

function renderInbox(){
  const container = document.querySelector('.inbox');
  const existingList = container.querySelector('.card-list'); if(existingList) existingList.remove();
  const list = document.createElement('div'); list.className='card-list';
  state.tasks.inbox.forEach(t=> list.appendChild(createTaskElement(t,'inbox')));
  container.appendChild(list);
  document.getElementById('inboxAdd').onclick = async ()=> {
    const title = document.getElementById('inboxText').value.trim(); if(!title) return;
    const xp = Number(document.getElementById('inboxXP').value)||10;
    const when = document.getElementById('inboxDate').value || null;
    const item = {id:genId(), title, XP:xp, done:false, when: when? new Date(when).toISOString(): null};
    state.tasks.inbox.unshift(item); saveState(); renderAll(); document.getElementById('inboxText').value=''; document.getElementById('inboxXP').value='10'; document.getElementById('inboxDate').value='';
    // notify server to register reminder if BOT_API_BASE set
    if(typeof BOT_API_BASE !== 'undefined' && BOT_API_BASE && !BOT_API_BASE.includes('REPLACE')){
      fetch(BOT_API_BASE + '/register_reminder', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({chat_id:'default', task:item})}).catch(e=>console.warn(e));
    }
  };
  // enable drop from inbox to buckets; buckets have drop handlers elsewhere
}

function renderBuckets(){
  ['short','mid','long','boss'].forEach(bucket=>{
    const container = document.getElementById(bucket+'List'); container.innerHTML='';
    state.tasks[bucket].forEach(t=> container.appendChild(createTaskElement(t,bucket)));
    container.ondrop = e=> { e.preventDefault(); try{ const data = JSON.parse(e.dataTransfer.getData('text/plain')); moveTaskToBucket(data.id, data.bucket, bucket); }catch(err){console.warn(err);} };
  });
}

function renderShop(){
  const shop = document.getElementById('shopList'); shop.innerHTML='';
  state.rewards.forEach(r=>{
    const el = document.createElement('div'); el.className='task-card';
    const can = getBalance() >= r.cost && !r.bought;
    el.innerHTML = `<div><strong>${r.title}</strong> <small class="muted">(${r.cost} XP)</small></div><div><button ${can? '': 'disabled'} class="buy-btn" data-id="${r.id}">${r.bought? '✓' : 'Купить'}</button> <button class="del-reward" data-id="${r.id}">🗑</button></div>`;
    el.querySelector('.buy-btn').addEventListener('click', ()=> buyReward(r.id));
    el.querySelector('.del-reward').addEventListener('click', ()=> deleteReward(r.id));
    shop.appendChild(el);
  });
  document.getElementById('addReward').onclick = ()=> { const title=document.getElementById('addRewardText').value.trim(); const cost=Number(document.getElementById('addRewardCost').value)||50; if(!title) return; state.rewards.unshift({id:genId(), title, cost, bought:false}); saveState(); renderAll(); document.getElementById('addRewardText').value=''; document.getElementById('addRewardCost').value='50'; };
}

function renderAchievements(){ const el=document.getElementById('achList'); el.innerHTML=''; state.achievements.forEach(a=>{ const c=document.createElement('div'); c.className='task-card ach-card'; c.innerText = a.title; el.appendChild(c); }); document.getElementById('addAch').onclick = ()=> { const v=document.getElementById('addAchText').value.trim(); if(!v) return; state.achievements.unshift({id:genId(), title:v, ts:Date.now()}); saveState(); renderAll(); document.getElementById('addAchText').value=''; }; }

function renderLevel(){ document.getElementById('levelNum').innerText = state.level; const pct=Math.round((state.xp / (state.level*100))*100); document.getElementById('levelProgress').style.width = Math.min(100,pct) + '%'; document.getElementById('currentXP').innerText = getBalance(); }

function toggleDone(id,bucket){ const list=state.tasks[bucket]; const t=list.find(x=>x.id===id); if(!t) return; if(t.done){ t.done=false; saveState(); renderAll(); return; } t.done=true; state.xpLog.unshift({ts:Date.now(), amount:t.XP, note:'Task: '+t.title}); // level up check
 while(state.xpLog.filter(l=>l.amount>0).reduce((s,l)=>s+l.amount,0) - state.xpLog.filter(l=>l.amount<0).reduce((s,l)=>s+Math.abs(l.amount),0) >= state.level*100){ state.level++; state.achievements.unshift({id:genId(), title:'Level '+state.level, ts:Date.now()}); alert('🎉 Level up! '+state.level); } saveState(); renderAll(); // notify server task complete
 if(typeof BOT_API_BASE!=='undefined' && BOT_API_BASE && !BOT_API_BASE.includes('REPLACE')){ fetch(BOT_API_BASE + '/task_completed', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({chat_id:'default', task:t})}).catch(e=>console.warn(e)); } }

function archiveTask(id,bucket){ const list=state.tasks[bucket]; const idx=list.findIndex(x=>x.id===id); if(idx===-1) return; const [it]=list.splice(idx,1); state.tasks.archive.unshift(it); saveState(); renderAll(); }
function deleteTask(id,bucket){ const list=state.tasks[bucket]; const idx=list.findIndex(x=>x.id===id); if(idx>-1) list.splice(idx,1); saveState(); renderAll(); }
function moveTaskToBucket(id,from,to){ const src=state.tasks[from]; const idx=src.findIndex(x=>x.id===id); if(idx===-1) return; const [it]=src.splice(idx,1); state.tasks[to].unshift(it); saveState(); renderAll(); }

function buyReward(id){ const r=state.rewards.find(x=>x.id===id); if(!r) return; if(getBalance()>=r.cost && !r.bought){ r.bought=true; state.xpLog.unshift({ts:Date.now(), amount:-r.cost, note:'Bought: '+r.title}); state.achievements.unshift({id:genId(), title:'Bought: '+r.title, ts:Date.now()}); saveState(); renderAll(); alert('Куплено: '+r.title); } else alert('Недостаточно XP'); }
function deleteReward(id){ const idx=state.rewards.findIndex(x=>x.id===id); if(idx>-1) state.rewards.splice(idx,1); saveState(); renderAll(); }

function getBalance(){ const pos=state.xpLog.filter(l=>l.amount>0).reduce((s,l)=>s+l.amount,0); const neg=state.xpLog.filter(l=>l.amount<0).reduce((s,l)=>s+Math.abs(l.amount),0); return pos - neg; }

// init drop targets
document.querySelectorAll('.col').forEach(c=>{ c.addEventListener('dragover', e=> e.preventDefault()); c.addEventListener('drop', e=>{ e.preventDefault(); try{ const data=JSON.parse(e.dataTransfer.getData('text/plain')); moveTaskToBucket(data.id, data.bucket, c.dataset.bucket); }catch(e){}}); });

// periodic client reminders (best-effort)
setInterval(()=>{
  const now = Date.now();
  ['inbox','short','mid','long','boss'].forEach(bucket=> state.tasks[bucket].forEach(t=>{ if(t.when && !t.done){ const then=new Date(t.when).getTime(); if(then - now < 5*60*1000 && then - now > 0){ console.log('Reminder upcoming for', t.title); } } }));
}, 60*1000);

renderAll();
