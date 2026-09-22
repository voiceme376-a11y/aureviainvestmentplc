import {json,requireUser,audit} from '../../_lib/auth.js';
export async function onRequestGet({request,env}){
  try{const u=await requireUser(request,env);const p=await env.DB.prepare('SELECT * FROM profiles WHERE user_id=?').bind(u.id).first();const banks=await env.DB.prepare('SELECT id,bank_code,bank_name,account_number_masked,account_name,currency,verified,created_at FROM beneficiaries WHERE user_id=? ORDER BY created_at DESC').bind(u.id).all();return json({profile:p||null,beneficiaries:banks.results||[]});}
  catch(e){return e instanceof Response?e:json({error:'Unable to load profile.'},500)}
}
export async function onRequestPut({request,env}){
  try{
    const u=await requireUser(request,env);const b=await request.json();
    const fields={first_name:'',middle_name:'',last_name:'',phone:'',date_of_birth:'',country:'NG',state:'',city:'',address_line1:'',address_line2:'',postal_code:'',occupation:'',nationality:'',gender:'',tax_residency:'',employer_name:'',source_of_funds:'',timezone:'Africa/Lagos',avatar_url:''};
    for(const k of Object.keys(fields))if(b[k]!==undefined)fields[k]=String(b[k]??'').trim();
    await env.DB.prepare(`INSERT INTO profiles(user_id,first_name,middle_name,last_name,phone,date_of_birth,country,state,city,address_line1,address_line2,postal_code,occupation,nationality,gender,tax_residency,employer_name,source_of_funds,timezone,avatar_url,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,datetime('now')) ON CONFLICT(user_id) DO UPDATE SET first_name=excluded.first_name,middle_name=excluded.middle_name,last_name=excluded.last_name,phone=excluded.phone,date_of_birth=excluded.date_of_birth,country=excluded.country,state=excluded.state,city=excluded.city,address_line1=excluded.address_line1,address_line2=excluded.address_line2,postal_code=excluded.postal_code,occupation=excluded.occupation,nationality=excluded.nationality,gender=excluded.gender,tax_residency=excluded.tax_residency,employer_name=excluded.employer_name,source_of_funds=excluded.source_of_funds,timezone=excluded.timezone,avatar_url=excluded.avatar_url,updated_at=datetime('now')`).bind(u.id,fields.first_name,fields.middle_name,fields.last_name,fields.phone,fields.date_of_birth,fields.country,fields.state,fields.city,fields.address_line1,fields.address_line2,fields.postal_code,fields.occupation,fields.nationality,fields.gender,fields.tax_residency,fields.employer_name,fields.source_of_funds,fields.timezone,fields.avatar_url).run();
    await env.DB.prepare("INSERT INTO notifications(id,user_id,title,body,kind) VALUES(?,?,?,?,?)").bind(crypto.randomUUID(),u.id,'Profile updated','Your personal profile was updated successfully.','security').run();
    await audit(env,u.id,'account.profile.details.updated',{country:fields.country,city:fields.city});
    const p=await env.DB.prepare('SELECT * FROM profiles WHERE user_id=?').bind(u.id).first();return json({profile:p});
  }catch(e){return e instanceof Response?e:json({error:'Profile update failed.'},500)}
}
