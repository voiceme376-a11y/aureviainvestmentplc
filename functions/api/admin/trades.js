import {json,requireAdmin,audit,randomToken} from '../../_lib/auth.js';

const clean=(v,max=500)=>String(v??'').trim().slice(0,max);
const num=v=>Number(v);
const optionalNum=v=>{if(v===null||v===undefined||String(v).trim()==='')return null;const n=Number(v);return Number.isFinite(n)?n:null};
const validStatus=v=>['OPEN','PAUSED','CLOSED'].includes(String(v||'').toUpperCase())?String(v).toUpperCase():null;

async function addUpdate(env,tradeId,admin,action,price,status,note=''){
  await env.DB.prepare(`INSERT INTO live_trade_updates(trade_id,admin_user_id,action,current_price,status,note) VALUES(?,?,?,?,?,?)`)
    .bind(tradeId,admin?.id||null,action,price??null,status??null,clean(note,500)).run();
}

async function writeCandle(env,tradeId,price,quantity,previousPrice){
  const bucket=Math.floor(Date.now()/15000)*15000;
  const last=await env.DB.prepare(`SELECT * FROM live_trade_candles WHERE trade_id=? ORDER BY ts DESC LIMIT 1`).bind(tradeId).first();
  if(last&&Number(last.ts)===bucket){
    await env.DB.prepare(`UPDATE live_trade_candles SET high=?,low=?,close=?,volume=? WHERE id=?`)
      .bind(Math.max(Number(last.high),price),Math.min(Number(last.low),price),price,Math.max(Number(last.volume||0),Number(quantity||0)),last.id).run();
  }else{
    const open=last?Number(last.close):Number(previousPrice||price);
    await env.DB.prepare(`INSERT OR REPLACE INTO live_trade_candles(trade_id,ts,open,high,low,close,volume) VALUES(?,?,?,?,?,?,?)`)
      .bind(tradeId,bucket,open,Math.max(open,price),Math.min(open,price),price,Number(quantity||0)).run();
  }
}

export async function onRequestGet({request,env}){
  try{
    await requireAdmin(request,env);
    const r=await env.DB.prepare(`SELECT t.*,u.name user_name,u.email user_email FROM live_trades t LEFT JOIN users u ON u.id=t.user_id ORDER BY CASE t.status WHEN 'OPEN' THEN 0 WHEN 'PAUSED' THEN 1 ELSE 2 END,t.updated_at DESC LIMIT 1000`).all();
    return json({trades:r.results||[],server_time:Date.now()});
  }catch(e){return e instanceof Response?e:json({error:'Admin trade feed unavailable.'},500)}
}

export async function onRequestPost({request,env}){
  try{
    const admin=await requireAdmin(request,env);
    const b=await request.json();
    const action=clean(b.action,30).toLowerCase();

    if(action==='create'){
      const symbol=clean(b.symbol,24).toUpperCase();
      const instrument=clean(b.instrument,80);
      const direction=clean(b.direction,8).toUpperCase();
      const entry=num(b.entry_price);
      const current=b.current_price===''||b.current_price==null?entry:num(b.current_price);
      const quantity=num(b.quantity||0);
      const leverage=num(b.leverage||1);
      const userId=clean(b.user_id,100)||null;
      const stop=optionalNum(b.stop_price),target=optionalNum(b.target_price);
      if(!symbol||!instrument||!['LONG','SHORT'].includes(direction)||!Number.isFinite(entry)||entry<=0||!Number.isFinite(current)||current<=0)return json({error:'Symbol, instrument, direction and valid prices are required.'},400);
      if(quantity<0||leverage<=0)return json({error:'Quantity and leverage must be valid.'},400);
      if(stop!==null&&stop<=0||target!==null&&target<=0)return json({error:'Stop and target prices must be positive.'},400);
      if(userId){const u=await env.DB.prepare(`SELECT id FROM users WHERE id=? AND status!='closed'`).bind(userId).first();if(!u)return json({error:'Selected user account was not found or is closed.'},400)}
      const id='trade_'+randomToken();
      await env.DB.prepare(`INSERT INTO live_trades(id,user_id,symbol,instrument,direction,quantity,leverage,entry_price,current_price,stop_price,target_price,status,note) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`)
        .bind(id,userId,symbol,instrument,direction,quantity,leverage,entry,current,stop,target,'OPEN',clean(b.note,500)).run();
      await writeCandle(env,id,current,quantity,current);
      await addUpdate(env,id,admin,'CREATED',current,'OPEN',b.note);
      await audit(env,admin.id,'admin.trade.created',{trade_id:id,user_id:userId,symbol,direction});
      return json({ok:true,trade:id});
    }

    const id=clean(b.id,120);
    if(!id)return json({error:'Trade id required.'},400);
    const existing=await env.DB.prepare(`SELECT * FROM live_trades WHERE id=?`).bind(id).first();
    if(!existing)return json({error:'Trade not found.'},404);

    if(action==='update'){
      const price=num(b.current_price);
      if(!Number.isFinite(price)||price<=0)return json({error:'A valid current price is required.'},400);
      const stop=optionalNum(b.stop_price);const target=optionalNum(b.target_price);
      const status=validStatus(b.status)||existing.status;
      const note=clean(b.note,500);
      const userId=b.user_id===undefined?existing.user_id:(clean(b.user_id,100)||null);
      if(userId){const u=await env.DB.prepare(`SELECT id FROM users WHERE id=? AND status!='closed'`).bind(userId).first();if(!u)return json({error:'Selected user account was not found or is closed.'},400)}
      await env.DB.prepare(`UPDATE live_trades SET user_id=?,current_price=?,stop_price=?,target_price=?,status=?,note=?,updated_at=datetime('now'),closed_at=CASE WHEN ?='CLOSED' THEN COALESCE(closed_at,datetime('now')) ELSE closed_at END WHERE id=?`)
        .bind(userId,price,stop,target,status,note,status,id).run();
      await writeCandle(env,id,price,existing.quantity,existing.current_price);
      await addUpdate(env,id,admin,'UPDATED',price,status,note);
      await audit(env,admin.id,'admin.trade.updated',{trade_id:id,current_price:price,status,user_id:userId});
      return json({ok:true});
    }

    if(action==='close'){
      await env.DB.prepare(`UPDATE live_trades SET status='CLOSED',updated_at=datetime('now'),closed_at=datetime('now') WHERE id=?`).bind(id).run();
      await addUpdate(env,id,admin,'CLOSED',existing.current_price,'CLOSED','Trade closed by administrator');
      await audit(env,admin.id,'admin.trade.closed',{trade_id:id});
      return json({ok:true});
    }

    if(action==='delete'){
      await env.DB.prepare(`DELETE FROM live_trades WHERE id=?`).bind(id).run();
      await audit(env,admin.id,'admin.trade.deleted',{trade_id:id});
      return json({ok:true});
    }

    return json({error:'Unknown trade action.'},400);
  }catch(e){return e instanceof Response?e:json({error:'Trade control action failed.'},500)}
}
