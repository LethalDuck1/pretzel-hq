const {json}=require("./_state");
const {login,ensureDefaultUser}=require("./_adminAuth");

function getIP(event){
  const h=event.headers||{};
  return (h["x-nf-client-connection-ip"]||h["x-forwarded-for"]||"").split(",")[0].trim();
}

exports.handler=async(event)=>{
  try{
    const cfg=await ensureDefaultUser();
    if(cfg && cfg.configured===false){
      return json(503,{error:"Admin login not configured. Set ADMIN_PASSWORD in Netlify env vars."});
    }
    const b=JSON.parse(event.body||"{}");
    const u=String(b.username||"").trim();
    const p=String(b.password||"");
    if(!u||!p) return json(400,{error:"Missing username/password"});
    const ip=getIP(event);
    const res=await login(u,p,ip);
    if(!res || res.ok===false){
      if(res && res.code==="locked"){
        return json(429,{error:"Too many tries. Try again later.", retryAt:res.retryAt});
      }
      if(res && res.code==="not_configured"){
        return json(503,{error:"Admin login not configured. Set ADMIN_PASSWORD in Netlify env vars."});
      }
      return json(401,{error:"Bad login"});
    }
    return { statusCode: 200, headers: { "Content-Type": "application/json", "Set-Cookie": `pretzel_admin_token=${encodeURIComponent(res.token)}; Path=/; Max-Age=2592000; SameSite=Lax; Secure` }, body: JSON.stringify({ ok:true, token:res.token, username:res.username }) };
  }catch(e){
    return json(500,{error:"Server error",detail:String(e&&e.message||e)});
  }
};
