import {json,randomToken,hashPassword} from "../../_lib/auth.js";
export async function onRequestPost({request,env}){
 try{
  const b=await request.json();
  if(!env.ADMIN_BOOTSTRAP_TOKEN||b.bootstrapToken!==env.ADMIN_BOOTSTRAP_TOKEN)return json({error:"Invalid bootstrap token."},403);
  const name=String(b.name||"Aurevia Admin").trim(),email=String(b.email||"").trim().toLowerCase(),password=String(b.password||"");
  if(!email.includes("@")||password.length<12)return json({error:"Admin email and a password of at least 12 characters are required."},400);
  const existing=await env.DB.prepare("SELECT id FROM users WHERE email=?").bind(email).first();
  const {salt,hash}=await hashPassword(password);
  const id=existing?.id||randomToken().slice(0,24);
  if(existing) await env.DB.prepare("UPDATE users SET name=?,password_hash=?,password_salt=?,role='admin',status='active' WHERE id=?").bind(name,hash,salt,id).run();
  else await env.DB.prepare("INSERT INTO users(id,name,email,password_hash,password_salt,role,plan,status) VALUES(?,?,?,?,?,'admin','VIP','active')").bind(id,name,email,hash,salt).run();
  return json({ok:true,message:"Admin provisioned. You can now log in with the admin account."});
 }catch(e){return json({error:"Admin bootstrap failed."},500)}
}
