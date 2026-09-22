import {json} from "../_lib/auth.js";
export async function onRequestGet({env}){
  let database="unavailable";
  try { await env.DB.prepare("SELECT 1 AS ok").first(); database="connected"; } catch {}
  return json({ok:true,service:"aurevia-platform",database,time:new Date().toISOString()});
}
