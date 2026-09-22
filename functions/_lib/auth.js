const enc=new TextEncoder();
export function json(data,status=200,extra={}){return new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=utf-8",...extra}})}
export function cookie(name,value,maxAge=86400){return `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`}
export function clearCookie(name){return `${name}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`}
export function randomToken(){const a=new Uint8Array(32);crypto.getRandomValues(a);return [...a].map(x=>x.toString(16).padStart(2,"0")).join("")}
export async function hashPassword(password,saltHex){const salt=saltHex?hexToBytes(saltHex):crypto.getRandomValues(new Uint8Array(16));const key=await crypto.subtle.importKey("raw",enc.encode(password),"PBKDF2",false,["deriveBits"]);const bits=await crypto.subtle.deriveBits({name:"PBKDF2",salt,iterations:120000,hash:"SHA-256"},key,256);return {salt:bytesToHex(salt),hash:bytesToHex(new Uint8Array(bits))}}
export function bytesToHex(a){return [...a].map(x=>x.toString(16).padStart(2,"0")).join("")}
export function hexToBytes(h){const a=new Uint8Array(h.length/2);for(let i=0;i<a.length;i++)a[i]=parseInt(h.slice(i*2,i*2+2),16);return a}
export async function currentUser(request,env){const token=request.headers.get("Cookie")?.match(/(?:^|; )aurevia_session=([^;]+)/)?.[1];if(!token)return null;const row=await env.DB.prepare(`SELECT u.id,u.name,u.email,u.role,u.plan,u.status FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=? AND s.expires_at>datetime('now')`).bind(token).first();return row||null}
export async function requireUser(request,env){const u=await currentUser(request,env);if(!u)throw new Response(JSON.stringify({error:"Authentication required"}),{status:401,headers:{"content-type":"application/json"}});return u}
export async function requireAdmin(request,env){const u=await requireUser(request,env);if(u.role!=="admin")throw new Response(JSON.stringify({error:"Admin access required"}),{status:403,headers:{"content-type":"application/json"}});return u}
export async function audit(env,userId,action,meta={}){await env.DB.prepare(`INSERT INTO audit_log(user_id,action,metadata) VALUES(?,?,?)`).bind(userId,action,JSON.stringify(meta)).run()}
