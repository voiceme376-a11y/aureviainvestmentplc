import {json,clearCookie} from "../../_lib/auth.js";
export async function onRequestPost({request,env}){const token=request.headers.get("Cookie")?.match(/(?:^|; )aurevia_session=([^;]+)/)?.[1];if(token)await env.DB.prepare("DELETE FROM sessions WHERE token=?").bind(token).run();return json({ok:true},200,{"Set-Cookie":clearCookie("aurevia_session")})}
