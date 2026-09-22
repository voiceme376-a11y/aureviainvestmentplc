import {json} from '../../_lib/auth.js';
import {paystackSignatureValid} from '../../_lib/paystack.js';
export async function onRequestPost({request,env}){
 const raw=await request.text();if(!(await paystackSignatureValid(request,env,raw)))return json({error:'Invalid signature.'},401);
 try{const event=JSON.parse(raw),d=event.data||{};if(event.event==='transfer.success'||event.event==='transfer.failed'||event.event==='transfer.reversed'){
   const ref=d.reference;const w=await env.DB.prepare('SELECT * FROM withdrawal_requests WHERE provider_reference=?').bind(ref).first();
   if(w){const success=event.event==='transfer.success';const finalStatus=success?'completed':event.event==='transfer.reversed'?'reversed':'failed';
     await env.DB.prepare("UPDATE withdrawal_requests SET status=?,updated_at=datetime('now') WHERE id=?").bind(finalStatus,w.id).run();
     await env.DB.prepare("UPDATE payment_transactions SET status=?,updated_at=datetime('now') WHERE id=?").bind(success?'success':'failed',w.transaction_id).run();
     const wallet=await env.DB.prepare("SELECT * FROM wallets WHERE user_id=? AND currency='NGN'").bind(w.user_id).first();
     if(wallet){
       if(success){
         await env.DB.prepare("UPDATE wallets SET balance_kobo=MAX(0,balance_kobo-?),locked_kobo=MAX(0,locked_kobo-?),updated_at=datetime('now') WHERE id=?").bind(w.amount_kobo,w.amount_kobo,wallet.id).run();
         const after=await env.DB.prepare('SELECT balance_kobo FROM wallets WHERE id=?').bind(wallet.id).first();
         await env.DB.prepare("INSERT OR IGNORE INTO ledger_entries(id,user_id,wallet_id,transaction_id,direction,amount_kobo,currency,balance_after_kobo,external_reference,description) VALUES(?,?,?,?,?,?,?,?,?,?)").bind(crypto.randomUUID(),w.user_id,wallet.id,w.transaction_id,'debit',w.amount_kobo,'NGN',Number(after?.balance_kobo||0),`paystack:${ref}`,'Withdrawal').run();
       } else {
         await env.DB.prepare("UPDATE wallets SET locked_kobo=MAX(0,locked_kobo-?),updated_at=datetime('now') WHERE id=?").bind(w.amount_kobo,wallet.id).run();
       }
     }
     await env.DB.prepare("INSERT INTO notifications(id,user_id,title,body,kind) VALUES(?,?,?,?,?)").bind(crypto.randomUUID(),w.user_id,success?'Withdrawal completed':'Withdrawal update',success?`Withdrawal ${ref} has been completed.`:`Withdrawal ${ref} was ${finalStatus}.`,'payment').run();
   }
 }return json({received:true});}catch(e){return json({error:'Transfer webhook processing failed.'},500)}
}
