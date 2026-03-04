const { getStore } = require("@netlify/blobs");

const STORE = "pretzel-hq";
const STATE_KEY = "state_v1";

function _envAny(keys){
  for (const k of keys){
    if (!k) continue;
    const v = process.env[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

function store(){
  const siteID = _envAny(["NETLIFY_SITE_ID","BLOBS_SITE_ID","SITE_ID","NETLIFY_SITEID"]);
  const token  = _envAny(["NETLIFY_AUTH_TOKEN","BLOBS_TOKEN","NETLIFY_TOKEN","AUTH_TOKEN","NETLIFY_AUTHTOKEN"]);
  if (siteID && token){
    try { return getStore({ name: STORE, siteID, token, consistency:"strong" }); }
    catch(e){ return getStore({ name: STORE, siteID, token }); }
  }
  try { return getStore({ name: STORE, consistency:"strong" }); }
  catch(e){ return getStore(STORE); }
}

function json(statusCode,obj){
  return { statusCode, headers:{ "content-type":"application/json" }, body: JSON.stringify(obj) };
}

// ---- Admin Auth (resilient) ----
// Preferred: Bearer token (from /adminLogin)
// Legacy fallback: x-admin-key header
function _adminKey(){
  const key = _envAny([
    "ADMIN_KEY",
    "LEGACY_ADMIN_KEY",
    "PRETZEL_ADMIN_KEY",
    "ADMIN_TOKEN",
    "ADMIN_AUTH",
    "ADMIN_SECRET",
    "ADMIN_PASSCODE",
    "ADMINCODE",
    "ADMIN_PASSWORD", // fallback (last)
  ]);
  return key;
}

function isAdmin(event){
  const h = event.headers || {};

  // ✅ Token auth
  const auth = (h["authorization"] || h["Authorization"] || "").toString().trim();
  const m = /^Bearer\s+(.+)$/i.exec(auth);
  if (m && m[1]){
    try{
      const { verifyToken } = require("./_adminAuth");
      const payload = verifyToken(String(m[1]).trim());
      if (payload && payload.u) return true;
    }catch(e){ /* ignore */ }
  }

  // ✅ Legacy key auth
  const adminKey = _adminKey();
  if (!adminKey) return false;
  const provided = h["x-admin-key"] || h["X-Admin-Key"] || h["x-admin"] || h["X-Admin"] || "";
  return provided && String(provided) === String(adminKey);
}

function mkId(prefix){
  return `${prefix}_${Math.random().toString(16).slice(2,10)}${Math.random().toString(16).slice(2,6)}`;
}

function normStatus(s){
  const v = String(s || "alive").toLowerCase();
  const allowed = new Set(["alive","pending","eliminated","revived"]);
  return allowed.has(v) ? v : "alive";
}

async function loadState(){
  const st = store();
  const raw = await st.get(STATE_KEY, { type:"json" });
  if (raw) return raw;
  return { lastUpdated:null, teams:[], players:[], log:[] };
}

async function saveState(state){
  const st = store();
  state.lastUpdated = new Date().toISOString();
  state.log = Array.isArray(state.log) ? state.log : [];
  if (state.log.length > 200) state.log = state.log.slice(state.log.length - 200);
  if (typeof st.setJSON === "function"){
    await st.setJSON(STATE_KEY, state);
  } else {
    await st.set(STATE_KEY, JSON.stringify(state), { contentType:"application/json" });
  }
  return state;
}

function pushLog(state,text){
  state.log = Array.isArray(state.log) ? state.log : [];
  state.log.push({ ts:new Date().toISOString(), text:String(text).slice(0,140) });
}

function countTeamMembers(state,teamId){
  return (state.players || []).filter(p => p.teamId === teamId).length;
}

module.exports = { json, isAdmin, mkId, normStatus, loadState, saveState, pushLog, countTeamMembers };
