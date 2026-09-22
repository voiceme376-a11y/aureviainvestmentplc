const BASE='https://api.paystack.co';
export async function paystack(env,path,options={}){
  if(!env.PAYSTACK_SECRET_KEY) throw new Error('PAYSTACK_NOT_CONFIGURED');
  const res=await fetch(BASE+path,{method:options.method||'GET',headers:{Authorization:`Bearer ${env.PAYSTACK_SECRET_KEY}`,'Content-Type':'application/json',...(options.headers||{})},body:options.body});
  const data=await res.json().catch(()=>({}));
  if(!res.ok||data.status===false){const e=new Error(data.message||'Paystack request failed');e.provider=data; e.status=res.status; throw e;}
  return data;
}
export async function paystackSignatureValid(request,env,raw){
  if(!env.PAYSTACK_SECRET_KEY)return false;
  const signature=request.headers.get('x-paystack-signature')||'';
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(env.PAYSTACK_SECRET_KEY),{name:'HMAC',hash:'SHA-512'},false,['sign']);
  const sig=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(raw));
  const hex=[...new Uint8Array(sig)].map(x=>x.toString(16).padStart(2,'0')).join('');
  return signature===hex;
}
export function kobo(n){const v=Number(n);if(!Number.isFinite(v)||v<=0)return 0;return Math.round(v*100)}
export function naira(k){return (Number(k||0)/100).toFixed(2)}
