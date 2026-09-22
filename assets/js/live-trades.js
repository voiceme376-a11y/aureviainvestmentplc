const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const moneyNum=v=>Number(v||0).toLocaleString(undefined,{maximumFractionDigits:8});
const pct=(current,entry,direction)=>{const c=Number(current),e=Number(entry);if(!Number.isFinite(c)||!Number.isFinite(e)||!e)return 0;const raw=((c-e)/e)*100;return direction==='SHORT'?-raw:raw};
const state={};

async function getJson(url,options={}){
  const r=await fetch(url,{credentials:'include',...options});
  const d=await r.json().catch(()=>({}));
  if(!r.ok)throw Object.assign(Error(d.error||'Live trade service unavailable.'),{status:r.status});
  return d;
}

export async function loadLiveTrades({admin=false,containerId='liveTradesMount'}={}){
  const mount=document.getElementById(containerId);if(!mount)return;
  try{
    const url=admin?new URL('../api/admin/trades',location.href):new URL('/api/trades/live',location.href);
    const d=await getJson(url);
    if(admin)renderAdminTrades(mount,d.trades||[]);
    else renderUserTrades(mount,d.trades||[],d.candles||{},d.server_time||Date.now());
  }catch(e){mount.innerHTML=`<div class="trade-feed-error"><b>LIVE FEED UNAVAILABLE</b><span>${esc(e.message)}</span><small>Connect the Aurevia D1 database and apply the live-trade migrations for server-controlled trades.</small></div>`}
}

function tradeIds(trades){return trades.map(t=>t.id).sort().join('|')}

function renderUserTrades(mount,trades,candles,serverTime){
  if(!trades.length){
    mount.innerHTML=`<div class="trade-empty"><div class="trade-core">⌁</div><h3>No live trades assigned</h3><p>Your account will show an administrator-published trade here when one is assigned to your account.</p></div>`;
    state.userIds='';
    return;
  }
  const keep=new Set(trades.map(t=>t.id));
  Object.keys(state).forEach(k=>{if(k!=='userIds'&&!keep.has(k)){if(state[k]?.raf)cancelAnimationFrame(state[k].raf);delete state[k]}});
  state.userIds=tradeIds(trades);
  mount.innerHTML=`<div class="live-trade-grid">${trades.map(t=>userCard(t,candles[t.id]||[],serverTime)).join('')}</div><div class="trade-feed-foot"><span>SERVER SYNC <b data-feed-time>${new Date(serverTime).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',second:'2-digit'})}</b></span><span>Prices are administrator-published feed values.</span></div>`;
  trades.forEach(t=>startChart(t,candles[t.id]||[]));
  if(!window.__aureviaTradePoll)window.__aureviaTradePoll=setInterval(refreshUserTrades,3000);
}

function userCard(t,rows,serverTime){
  const move=pct(t.current_price,t.entry_price,t.direction);
  const sign=move>=0?'+':'';
  return `<article class="live-trade-card" data-trade-id="${esc(t.id)}">
    <div class="trade-card-head"><div><span class="eyebrow">${esc(t.instrument)}</span><h3>${esc(t.symbol)} <i class="direction ${t.direction==='LONG'?'long':'short'}">${esc(t.direction)}</i></h3></div><span class="live-dot ${String(t.status).toLowerCase()}">${esc(t.status)}</span></div>
    <div class="trade-price-row"><div><small>LIVE PRICE</small><strong data-price>${moneyNum(t.current_price)}</strong></div><div class="trade-change ${move>=0?'up':'down'}" data-change>${sign}${move.toFixed(2)}%</div></div>
    <div class="four-d-chart-wrap"><canvas class="four-d-chart" height="300" aria-label="${esc(t.symbol)} running market chart"></canvas><div class="chart-hud"><span>ADMIN FEED</span><span>4D CANDLE ENGINE</span><span data-chart-time>${new Date(serverTime).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',second:'2-digit'})}</span></div><div class="chart-scan"></div></div>
    <div class="trade-levels"><div><small>ENTRY</small><b>${moneyNum(t.entry_price)}</b></div><div><small>STOP</small><b>${t.stop_price!=null?moneyNum(t.stop_price):'—'}</b></div><div><small>TARGET</small><b>${t.target_price!=null?moneyNum(t.target_price):'—'}</b></div><div><small>LEVERAGE</small><b>${moneyNum(t.leverage)}×</b></div></div>
    <div class="trade-monitor-row"><span>PRICE MOVE</span><b class="${move>=0?'up':'down'}">${sign}${move.toFixed(3)}%</b><span>UPDATED</span><b data-updated>${esc(t.updated_at||'—')}</b></div>
    <p class="trade-note">${esc(t.note||'Administrator-controlled live trade instruction.')}</p>
    <p class="trade-disclaimer">Monitoring view only. The chart does not execute orders or move wallet funds.</p>
  </article>`;
}

async function refreshUserTrades(){
  try{
    const d=await getJson(new URL('/api/trades/live',location.href));
    const trades=d.trades||[];
    const mount=document.getElementById('liveTradesMount');if(!mount)return;
    if(tradeIds(trades)!==state.userIds){renderUserTrades(mount,trades,d.candles||{},d.server_time||Date.now());return;}
    trades.forEach(t=>{
      const card=mount.querySelector(`[data-trade-id="${CSS.escape(t.id)}"]`);if(!card)return;
      const p=card.querySelector('[data-price]');if(p)p.textContent=moneyNum(t.current_price);
      const move=pct(t.current_price,t.entry_price,t.direction),ch=card.querySelector('[data-change]');
      if(ch){ch.textContent=(move>=0?'+':'')+move.toFixed(2)+'%';ch.className='trade-change '+(move>=0?'up':'down')}
      const time=card.querySelector('[data-chart-time]');if(time)time.textContent=new Date(d.server_time||Date.now()).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',second:'2-digit'});
      const updated=card.querySelector('[data-updated]');if(updated)updated.textContent=t.updated_at||'—';
      const dot=card.querySelector('.live-dot');if(dot){dot.textContent=t.status;dot.className='live-dot '+String(t.status).toLowerCase()}
      if(state[t.id]){state[t.id].lastTrade=t;state[t.id].rows=(d.candles||{})[t.id]||[]}
      draw4D(card,t,(d.candles||{})[t.id]||[]);
    });
    const feed=mount.querySelector('[data-feed-time]');if(feed)feed.textContent=new Date(d.server_time||Date.now()).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',second:'2-digit'});
  }catch{}
}

function startChart(t,rows){
  const card=document.querySelector(`[data-trade-id="${CSS.escape(t.id)}"]`);if(!card)return;
  const key=t.id;
  if(state[key]?.raf)cancelAnimationFrame(state[key].raf);
  state[key]={rows,lastTrade:t,phase:0,raf:0};
  const loop=()=>{const s=state[key];if(!s)return;s.phase=(s.phase+0.018)%1;draw4D(card,s.lastTrade,s.rows,s.phase);s.raf=requestAnimationFrame(loop)};
  loop();
}

function draw4D(card,t,data,phase=0){
  const c=card?.querySelector('canvas');if(!c)return;
  const rect=c.getBoundingClientRect();
  const dpr=Math.max(1,Math.min(2,devicePixelRatio||1));
  const w=Math.max(260,Math.floor(rect.width||card.clientWidth||320));
  const h=Math.max(250,Math.floor(rect.height||300));
  if(c.width!==w*dpr||c.height!==h*dpr){c.width=w*dpr;c.height=h*dpr}
  const x=c.getContext('2d');x.setTransform(dpr,0,0,dpr,0,0);x.clearRect(0,0,w,h);
  const bg=x.createLinearGradient(0,0,0,h);bg.addColorStop(0,'#071426');bg.addColorStop(1,'#020712');x.fillStyle=bg;x.fillRect(0,0,w,h);

  // Perspective floor: purely visual depth, never a fabricated price series.
  x.save();x.globalAlpha=.22;x.strokeStyle='#48dfff';x.lineWidth=1;
  for(let i=0;i<8;i++){const y=32+i*28;x.beginPath();x.moveTo(0,y);x.lineTo(w,y);x.stroke()}
  const horizon=h*.34,center=w*.54;
  for(let i=-10;i<=10;i++){x.beginPath();x.moveTo(center+i*18,h);x.lineTo(center+i*7,horizon);x.stroke()}
  x.restore();

  const rows=data.slice(-80),vals=rows.flatMap(r=>[+r.high,+r.low]).filter(Number.isFinite);
  let min=Math.min(...vals),max=Math.max(...vals),current=Number(t.current_price);
  if(!Number.isFinite(min)||!Number.isFinite(max)){min=current*.995;max=current*1.005}
  if(min===max){min*=.99;max*=1.01}
  const pad=(max-min)*.14;min-=pad;max+=pad;
  const left=14,right=10,top=24,bottom=24;
  const px=i=>left+i*(w-left-right)/Math.max(1,rows.length-1);
  const py=v=>h-bottom-((v-min)/(max-min))*(h-top-bottom);
  const cw=Math.max(3,Math.min(9,(w-left-right)/Math.max(1,rows.length)*.62));

  rows.forEach((r,i)=>{
    const xx=px(i),o=py(+r.open),cl=py(+r.close),hi=py(+r.high),lo=py(+r.low),up=+r.close>=+r.open;
    x.save();
    x.strokeStyle=up?'#63f7c8':'#ff5f8f';x.fillStyle=up?'rgba(99,247,200,.82)':'rgba(255,95,143,.82)';x.lineWidth=1;
    x.beginPath();x.moveTo(xx,hi);x.lineTo(xx,lo);x.stroke();
    const y=Math.min(o,cl),bh=Math.max(2,Math.abs(cl-o));x.fillRect(xx-cw/2,y,cw,bh);
    x.globalAlpha=.12;x.translate(4,4);x.fillRect(xx-cw/2,y,cw,bh);x.translate(4,4);x.fillRect(xx-cw/2,y,cw,bh);
    x.restore();
  });

  const cp=py(current);
  x.save();x.strokeStyle='#c4f7ff';x.globalAlpha=.88;x.setLineDash([5,5]);x.beginPath();x.moveTo(0,cp);x.lineTo(w,cp);x.stroke();x.restore();
  x.fillStyle='#d8fbff';x.font='600 10px system-ui';x.fillText(moneyNum(current),Math.max(8,w-88),Math.max(14,cp-7));

  // Animated scanner / energy field: moves the rendering without inventing market prices.
  const sweep=((phase||0)*1.7)%1;
  const sx=left+sweep*(w-left-right);
  const g=x.createLinearGradient(sx-45,0,sx+45,0);g.addColorStop(0,'rgba(83,225,255,0)');g.addColorStop(.5,'rgba(83,225,255,.16)');g.addColorStop(1,'rgba(83,225,255,0)');x.fillStyle=g;x.fillRect(sx-45,0,90,h);
  x.save();x.globalAlpha=.18;x.strokeStyle='#b49cff';
  for(let z=0;z<5;z++){const off=((phase*30+z*34)%150);x.beginPath();x.moveTo(w*.54-z*20-off,h);x.lineTo(w*.54+z*24-off,horizon);x.stroke()}
  x.restore();
}

function renderAdminTrades(mount,trades){
  const users=window.AUREVIA_ADMIN_USERS||[];
  mount.innerHTML=`<div class="trade-admin-create"><div class="eyebrow">PUBLISH LIVE TRADE</div><h3>Administrator trade feed</h3><p>Publish a server-side monitoring feed to one registered account or every active account. Users see only the records permitted by their account.</p><div class="admin-trade-form">
    <select id="tradeUser"><option value="">All active accounts</option>${users.filter(u=>u.status!=='closed').map(u=>`<option value="${esc(u.id)}">${esc(u.name)} · ${esc(u.email)}</option>`).join('')}</select>
    <input id="tradeSymbol" maxlength="24" placeholder="Symbol e.g. BTC/USDT">
    <input id="tradeInstrument" maxlength="80" placeholder="Instrument name">
    <select id="tradeDirection"><option>LONG</option><option>SHORT</option></select>
    <input id="tradeEntry" type="number" step="any" min="0" placeholder="Entry price">
    <input id="tradeCurrent" type="number" step="any" min="0" placeholder="Current price (optional)">
    <input id="tradeStop" type="number" step="any" min="0" placeholder="Stop price (optional)">
    <input id="tradeTarget" type="number" step="any" min="0" placeholder="Target price (optional)">
    <input id="tradeQty" type="number" step="any" min="0" placeholder="Quantity">
    <input id="tradeLev" type="number" step="any" min="1" value="1" placeholder="Leverage">
    <input id="tradeNote" class="wide" maxlength="500" placeholder="Trade note / instruction">
    <button class="btn primary" id="publishTrade">Publish live trade</button>
  </div></div>
  <div class="trade-admin-toolbar"><span>${trades.length} server trade${trades.length===1?'':'s'}</span><button class="btn secondary" id="refreshAdminTrades">Refresh feed</button></div>
  <div class="trade-admin-list">${trades.map(t=>adminRow(t,users)).join('')||'<div class="trade-empty"><h3>No administrator trades</h3><p>Create the first server-side trade above.</p></div>'}</div>`;

  mount.querySelector('#publishTrade').onclick=()=>createTrade(mount);
  mount.querySelector('#refreshAdminTrades').onclick=()=>loadLiveTrades({admin:true,containerId:'liveTradesAdminMount'});
  mount.querySelectorAll('[data-update-trade]').forEach(btn=>btn.onclick=()=>updateTrade(mount,btn.dataset.updateTrade));
  mount.querySelectorAll('[data-close-trade]').forEach(btn=>btn.onclick=()=>closeTrade(mount,btn.dataset.closeTrade));
  mount.querySelectorAll('[data-delete-trade]').forEach(btn=>btn.onclick=()=>deleteTrade(mount,btn.dataset.deleteTrade));
}

function adminRow(t,users){
  const selected=users.find(u=>u.id===t.user_id);
  return `<article class="admin-trade-row" data-admin-trade="${esc(t.id)}">
    <div><b>${esc(t.symbol)} · ${esc(t.direction)}</b><small>${esc(t.instrument)} · ${esc(t.user_name||selected?.name||'All active accounts')}</small></div>
    <span class="admin-price">${moneyNum(t.current_price)}</span>
    <span class="status-chip">${esc(t.status)}</span>
    <input class="admin-price-input" type="number" step="any" value="${esc(t.current_price)}" aria-label="Current price">
    <select class="admin-status"><option ${t.status==='OPEN'?'selected':''}>OPEN</option><option ${t.status==='PAUSED'?'selected':''}>PAUSED</option><option ${t.status==='CLOSED'?'selected':''}>CLOSED</option></select>
    <select class="admin-assignee"><option value="">All active accounts</option>${users.filter(u=>u.status!=='closed').map(u=>`<option value="${esc(u.id)}" ${u.id===t.user_id?'selected':''}>${esc(u.name)}</option>`).join('')}</select>
    <input class="admin-stop" type="number" step="any" value="${t.stop_price??''}" placeholder="Stop" aria-label="Stop price">
    <input class="admin-target" type="number" step="any" value="${t.target_price??''}" placeholder="Target" aria-label="Target price">
    <input class="admin-note" value="${esc(t.note||'')}" maxlength="500" placeholder="Trade note">
    <button class="btn secondary" data-update-trade="${esc(t.id)}">Save</button>
    ${t.status!=='CLOSED'?`<button class="btn secondary" data-close-trade="${esc(t.id)}">Close</button>`:''}
    <button class="btn secondary danger" data-delete-trade="${esc(t.id)}">Delete</button>
  </article>`;
}

async function postTrade(body){return getJson(new URL('../api/admin/trades',location.href),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})}
function adminToast(message){let t=document.getElementById('toast');if(t){t.textContent=message;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2600)}else window.alert(message)}
async function createTrade(mount){
  const g=id=>document.getElementById(id)?.value||'';
  try{
    await postTrade({action:'create',user_id:g('tradeUser'),symbol:g('tradeSymbol'),instrument:g('tradeInstrument'),direction:g('tradeDirection'),entry_price:g('tradeEntry'),current_price:g('tradeCurrent'),stop_price:g('tradeStop'),target_price:g('tradeTarget'),quantity:g('tradeQty'),leverage:g('tradeLev'),note:g('tradeNote')});
    adminToast('Live trade published to the server.');loadLiveTrades({admin:true,containerId:'liveTradesAdminMount'});
  }catch(e){adminToast(e.message)}
}
async function updateTrade(mount,id){
  const row=mount.querySelector(`[data-admin-trade="${CSS.escape(id)}"]`);if(!row)return;
  try{
    await postTrade({action:'update',id,current_price:row.querySelector('.admin-price-input').value,status:row.querySelector('.admin-status').value,user_id:row.querySelector('.admin-assignee').value,stop_price:row.querySelector('.admin-stop').value,target_price:row.querySelector('.admin-target').value,note:row.querySelector('.admin-note').value});
    adminToast('Trade feed updated.');loadLiveTrades({admin:true,containerId:'liveTradesAdminMount'});
  }catch(e){adminToast(e.message)}
}
async function closeTrade(mount,id){
  if(!confirm('Close this live trade feed?'))return;
  try{await postTrade({action:'close',id});adminToast('Trade feed closed.');loadLiveTrades({admin:true,containerId:'liveTradesAdminMount'})}catch(e){adminToast(e.message)}
}
async function deleteTrade(mount,id){
  if(!confirm('Delete this trade and its chart history?'))return;
  try{await postTrade({action:'delete',id});adminToast('Trade deleted.');loadLiveTrades({admin:true,containerId:'liveTradesAdminMount'})}catch(e){adminToast(e.message)}
}
