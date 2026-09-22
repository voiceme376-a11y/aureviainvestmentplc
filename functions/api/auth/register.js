import {json,cookie,randomToken,hashPassword,audit} from "../../_lib/auth.js";
export async function onRequestPost({request,env}){
 try{const b=await request.json();const name=String(b.name||"").trim(),email=String(b.email||"").trim().toLowerCase(),password=String(b.password||""),phone=String(b.phone||"").trim(),country=String(b.country||"").trim();
 if(name.length<2||!email.includes("@")||password.length<8||phone.length<7||country.length<2)return json({error:"Enter your full name, valid email, phone, country and a password of at least 8 characters."},400);
 const existing=await env.DB.prepare("SELECT id FROM users WHERE email=?").bind(email).first();if(existing)return json({error:"An account with that email already exists."},409);
 const {salt,hash}=await hashPassword(password);const id=randomToken().slice(0,24);await env.DB.prepare("INSERT INTO users(id,name,email,password_hash,password_salt,role,plan,status) VALUES(?,?,?,?,?,'user','Basic','active')").bind(id,name,email,hash,salt).run();
 await env.DB.batch([env.DB.prepare("INSERT INTO profiles(user_id,first_name,last_name,phone,country) VALUES(?,?,?,?,?)").bind(id,name.split(' ')[0],name.split(' ').slice(1).join(' '),phone,country),env.DB.prepare("INSERT INTO wallets(id,user_id,currency,balance_kobo,locked_kobo) VALUES(?,?,?,?,0)").bind(randomToken().slice(0,24),id,'NGN',0),env.DB.prepare("INSERT INTO notifications(id,user_id,title,body,kind) VALUES(?,?,?,?,?)").bind(randomToken().slice(0,24),id,'Welcome to Aurevia','Complete your profile and identity verification to unlock account operations.','system')]);
 const token=randomToken();await env.DB.prepare("INSERT INTO sessions(token,user_id,expires_at) VALUES(?,?,datetime('now','+7 days'))").bind(token,id).run();await audit(env,id,"account.created");
 const user={id,name,email,role:"user",plan:"Basic",status:"active"};return json({user},201,{"Set-Cookie":cookie("aurevia_session",token,604800)});
 }catch(e){return json({error:"Registration failed."},500)}
}
