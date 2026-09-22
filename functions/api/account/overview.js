import {json,requireUser} from '../../_lib/auth.js';
export async function onRequestGet({request,env}){
 try{const u=await requireUser(request,env);const [wallet,profile,counts,tx]=await Promise.all([
  env.DB.prepare("SELECT currency,balance_kobo,locked_kobo FROM wallets WHERE user_id=? AND currency='NGN'").bind(u.id).first(),
  env.DB.prepare('SELECT * FROM profiles WHERE user_id=?').bind(u.id).first(),
  env.DB.prepare("SELECT (SELECT COUNT(*) FROM payment_transactions WHERE user_id=? AND type='deposit' AND status='success') deposits,(SELECT COUNT(*) FROM withdrawal_requests WHERE user_id=?) withdrawals,(SELECT COUNT(*) FROM audit_log WHERE user_id=?) audit_events").bind(u.id,u.id,u.id).first(),
  env.DB.prepare("SELECT p.type,p.provider_reference,p.amount_kobo,p.currency,p.status,p.description,p.created_at FROM payment_transactions p WHERE p.user_id=? ORDER BY p.created_at DESC LIMIT 10").bind(u.id).all()
 ]);return json({user:u,profile:profile||null,wallet:wallet||{currency:'NGN',balance_kobo:0,locked_kobo:0},counts:counts||{},transactions:tx.results||[]});
 }catch(e){return e instanceof Response?e:json({error:'Unable to load account overview.'},500)}
}
