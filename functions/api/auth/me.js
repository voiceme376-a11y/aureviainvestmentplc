import {json,currentUser} from "../../_lib/auth.js";
export async function onRequestGet({request,env}){
  const user=await currentUser(request,env);
  if(!user) return json({error:"Authentication required."},401);
  return json({user});
}
