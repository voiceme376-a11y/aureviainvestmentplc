import {json,requireUser} from '../../_lib/auth.js';

export async function onRequestGet({request,env}){
  try{
    const user=await requireUser(request,env);
    const url=new URL(request.url);
    const tradeId=url.searchParams.get('trade');
    const q=tradeId
      ? await env.DB.prepare(`SELECT * FROM live_trades WHERE id=? AND (user_id=? OR user_id IS NULL)`).bind(tradeId,user.id).all()
      : await env.DB.prepare(`SELECT * FROM live_trades WHERE (user_id=? OR user_id IS NULL) ORDER BY CASE status WHEN 'OPEN' THEN 0 WHEN 'PAUSED' THEN 1 ELSE 2 END, updated_at DESC`).bind(user.id).all();
    const trades=q.results||[];
    const candles={};
    const updates={};
    for(const t of trades){
      const c=await env.DB.prepare(`SELECT ts,open,high,low,close,volume FROM live_trade_candles WHERE trade_id=? ORDER BY ts DESC LIMIT 240`).bind(t.id).all();
      candles[t.id]=(c.results||[]).reverse();
      const u=await env.DB.prepare(`SELECT action,current_price,status,created_at FROM live_trade_updates WHERE trade_id=? ORDER BY id DESC LIMIT 12`).bind(t.id).all();
      updates[t.id]=u.results||[];
    }
    return json({trades,candles,updates,server_time:Date.now()});
  }catch(e){return e instanceof Response?e:json({error:'Live trade feed unavailable.'},500)}
}
