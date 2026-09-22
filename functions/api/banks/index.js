import {json,requireUser} from '../../_lib/auth.js';
import {paystack} from '../../_lib/paystack.js';
export async function onRequestGet({request,env}){try{await requireUser(request,env);const d=await paystack(env,'/bank?country=nigeria&perPage=100');return json({banks:d.data||[]})}catch(e){return e instanceof Response?e:json({error:e.message==='PAYSTACK_NOT_CONFIGURED'?'Payments are not configured yet.':'Unable to load banks.'},502)}}
