import {json,requireUser,audit} from '../../_lib/auth.js';
import {paystack,kobo} from '../../_lib/paystack.js';
export async function onRequestPost({request,env}){
 try{const u=await requireUser(request,env);const b=await request.json();const amount=kobo(b.amount),currency=String(b.currency||'NGN').toUpperCase();if(amount<100)return json({error:'Minimum deposit is ₦1.00.'},400);if(currency!=='NGN')return json({error:'This live payment workflow currently supports NGN.'},400);
 const id=crypto.randomUUID(),reference=`aur_${id.replaceAll('-','')}`;await env.DB.prepare("INSERT INTO payment_transactions(id,user_id,type,provider,provider_reference,amount_kobo,currency,status,description,metadata) VALUES(?,?,?,?,?,?,?,?,?,?)").bind(id,u.id,'deposit','paystack',reference,amount,currency,'pending','Wallet deposit',JSON.stringify({source:'web'})).run();
 const data=await paystack(env,'/transaction/initialize',{method:'POST',body:JSON.stringify({email:u.email,amount:String(amount),currency,reference,callback_url:`${new URL(request.url).origin}/deposit.html?reference=${reference}`,metadata:{user_id:u.id,transaction_id:id}})});
 await audit(env,u.id,'payment.deposit.initialized',{transaction:id,reference,amount});return json({transaction:{id,reference,amount_kobo:amount,status:'pending'},authorization_url:data.data.authorization_url,access_code:data.data.access_code});
 }catch(e){return e instanceof Response?e:json({error:e.message==='PAYSTACK_NOT_CONFIGURED'?'Payments are not configured yet. Add PAYSTACK_SECRET_KEY in Cloudflare secrets.':(e.provider?.message||'Unable to initialize deposit.')},502)}
}
