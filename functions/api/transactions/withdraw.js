import {json,requireUser,audit} from '../../_lib/auth.js';
export async function onRequestPost({request,env}){
 try{const u=await requireUser(request,env);const b=await request.json();const amount=Math.round(Number(b.amount)*100),beneficiaryId=String(b.beneficiaryId||'');if(!Number.isFinite(amount)||amount<10000)return json({error:'Minimum withdrawal is ₦100.00.'},400);if(!beneficiaryId)return json({error:'Select a verified bank beneficiary.'},400);
 const profile=await env.DB.prepare('SELECT identity_status,address_status FROM profiles WHERE user_id=?').bind(u.id).first();if(!profile||profile.identity_status!=='approved')return json({error:'Identity verification must be approved before withdrawals.'},403);
 const ben=await env.DB.prepare('SELECT * FROM beneficiaries WHERE id=? AND user_id=? AND verified=1').bind(beneficiaryId,u.id).first();if(!ben)return json({error:'Verified beneficiary not found.'},404);
 const wallet=await env.DB.prepare("SELECT * FROM wallets WHERE user_id=? AND currency='NGN'").bind(u.id).first();if(!wallet||Number(wallet.balance_kobo)-Number(wallet.locked_kobo)<amount)return json({error:'Insufficient available balance.'},400);
 const txid=crypto.randomUUID(),wid=crypto.randomUUID(),ref=`wd_${wid.replaceAll('-','')}`;await env.DB.batch([
  env.DB.prepare("INSERT INTO payment_transactions(id,user_id,type,provider,provider_reference,amount_kobo,currency,status,description) VALUES(?,?,?,?,?,?,?,?,?)").bind(txid,u.id,'withdrawal','paystack',ref,amount,'NGN','pending','Withdrawal request'),
  env.DB.prepare("INSERT INTO withdrawal_requests(id,user_id,beneficiary_id,transaction_id,amount_kobo,status,provider_reference) VALUES(?,?,?,?,?,?,?)").bind(wid,u.id,beneficiaryId,txid,amount,'pending',ref),
  env.DB.prepare("UPDATE wallets SET locked_kobo=locked_kobo+?,updated_at=datetime('now') WHERE id=?").bind(amount,wallet.id),
  env.DB.prepare("INSERT INTO notifications(id,user_id,title,body,kind) VALUES(?,?,?,?,?)").bind(crypto.randomUUID(),u.id,'Withdrawal submitted',`Your withdrawal request ${ref} is awaiting review.`,'payment')
 ]);await audit(env,u.id,'payment.withdrawal.requested',{withdrawal:wid,amount});return json({request:{id:wid,reference:ref,status:'pending'}} ,201);
 }catch(e){return e instanceof Response?e:json({error:'Unable to create withdrawal request.'},500)}
}
