const{getStore}=require("@netlify/blobs");const STORE="pretzel-hq";const STATE_KEY="state_v1";function store(){const siteID=process.env.NETLIFY_SITE_ID || process.env.BLOBS_SITE_ID || "";const token=process.env.NETLIFY_AUTH_TOKEN || process.env.BLOBS_TOKEN || "";if(siteID && token){try{return getStore({name:"pretzel-hq",siteID,token,consistency:"strong"});}catch(e){return getStore({name:"pretzel-hq",siteID,token});}}try{return getStore({name:"pretzel-hq",consistency:"strong"});}catch(e){return getStore("pretzel-hq");}}function json(statusCode,obj){return{statusCode,headers:{"content-type":"application/json"},body:JSON.stringify(obj)};}function isAdmin(event){
  const headers = event.headers || {};
  const adminKey = process.env.ADMIN_KEY || "";
  const providedKey = headers["x-admin-key"] || headers["X-Admin-Key"] || "";
  if(adminKey && providedKey && String(providedKey)===String(adminKey)) return true;

  // Session token login (username/password)
  const token = headers["x-admin-session"] || headers["X-Admin-Session"] || "";
  if(!token) return false;

  const secret = process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD || "";
  if(!secret) return false;

  try{
    const parts = String(token).split(".");
    if(parts.length !== 2) return false;
    const payloadB64 = parts[0];
    const sig = parts[1];
    const expected = require("crypto").createHmac("sha256", secret).update(payloadB64).digest("base64url");
    if(expected !== sig) return false;

    const payloadJson = Buffer.from(payloadB64, "base64url").toString("utf8");
    const payload = JSON.parse(payloadJson);
    if(!payload || payload.t !== "admin") return false;
    if(payload.exp && Date.now() > payload.exp) return false;
    // optional: match ADMIN_USER if set
    const adminUser = process.env.ADMIN_USER || "";
    if(adminUser && payload.u && String(payload.u) !== String(adminUser)) return false;
    return true;
  }catch(e){
    return false;
  }
}function mkId(prefix){return `${prefix}_${Math.random().toString(16).slice(2,10)}${Math.random().toString(16).slice(2,6)}`;}function normStatus(s){const v=String(s || "alive").toLowerCase();const allowed=new Set(["alive","pending","eliminated","revived"]);return allowed.has(v)? v:"alive";}async function loadState(){const st=store();const raw=await st.get(STATE_KEY,{type:"json"});if(raw)return raw;return{lastUpdated:null,teams:[],players:[],log:[]};}async function saveState(state){const st=store();state.lastUpdated=new Date().toISOString();state.log=Array.isArray(state.log)? state.log:[];if(state.log.length>200)state.log=state.log.slice(state.log.length-200);if(typeof st.setJSON==="function"){await st.setJSON(STATE_KEY,state);}else{await st.set(STATE_KEY,JSON.stringify(state),{contentType:"application/json"});}return state;}function pushLog(state,text){state.log=Array.isArray(state.log)? state.log:[];state.log.push({ts:new Date().toISOString(),text:String(text).slice(0,140)});}function countTeamMembers(state,teamId){return(state.players || []).filter(p=>p.teamId===teamId).length;}module.exports={json,isAdmin,mkId,normStatus,loadState,saveState,pushLog,countTeamMembers};