const crypto = require("crypto");
const { getStore } = require("@netlify/blobs");

function envFirst(keys){
  for (const k of keys){
    const v = process.env[k];
    if (v && String(v).trim()) return String(v).trim();
  }
  return "";
}

const STORE = "pretzel-hq";
const KEY = "admin_auth_v1";

function store(){
  const siteID = process.env.NETLIFY_SITE_ID || process.env.BLOBS_SITE_ID || "";
  const token = process.env.NETLIFY_AUTH_TOKEN || process.env.BLOBS_TOKEN || "";
  if (siteID && token){
    try { return getStore({ name: STORE, siteID, token, consistency:"strong" }); }
    catch { return getStore({ name: STORE, siteID, token }); }
  }
  try { return getStore({ name: STORE, consistency:"strong" }); }
  catch { return getStore(STORE); }
}

function sha256(s){
  return crypto.createHash("sha256").update(String(s)).digest("hex");
}

function randToken(){
  return crypto.randomBytes(24).toString("base64url");
}

function signSecret(){
  return envFirst(["SESSION_SECRET","ADMIN_SESSION_SECRET","ADMIN_PASSWORD","ADMIN_KEY"]) || "pretzel-fallback-secret";
}

function signPayload(obj){
  const payload = Buffer.from(JSON.stringify(obj)).toString("base64url");
  const sig = crypto.createHmac("sha256", signSecret()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

function verifyToken(token){
  if (!token || !String(token).includes(".")) return null;
  const [payload, sig] = String(token).split(".", 2);
  const good = crypto.createHmac("sha256", signSecret()).update(payload).digest("base64url");
  if (sig !== good) return null;
  let data = null;
  try { data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")); } catch { return null; }
  if (!data || !data.u) return null;
  if (data.exp && Date.now() > Number(data.exp)) return null;
  return data;
}

async function load(){
  const st = store();
  const raw = await st.get(KEY, { type:"json" });
  return raw || { users:{}, sessions:{}, attempts:{} };
}

async function save(obj){
  const st = store();
  if (typeof st.setJSON === "function") await st.setJSON(KEY, obj);
  else await st.set(KEY, JSON.stringify(obj), { contentType:"application/json" });
  return obj;
}

async function verifySession(token){
  // Accept stateless signed token first
  const signed = verifyToken(token);
  if (signed) return signed;

  const data = await load();
  const h = sha256(token);
  const s = data.sessions && data.sessions[h];
  if (!s) return null;
  const now = Date.now();
  if (s.exp && now > s.exp){
    delete data.sessions[h];
    await save(data);
    return null;
  }
  return s;
}

async function createSession(user){
  const data = await load();
  const raw = randToken();
  const h = sha256(raw);
  const exp = Date.now() + 1000*60*60*24*14;
  data.sessions = data.sessions || {};
  data.sessions[h] = { user, u:user, ts:new Date().toISOString(), exp };
  await save(data);
  // return signed token so sync verification also works
  return signPayload({ u:user, exp });
}

async function ensureDefaultUser(){
  const u = envFirst(["ADMIN_USER","LEGACY_ADMIN_USER","PRETZEL_ADMIN_USER"]) || "admin";
  const p = envFirst(["ADMIN_PASSWORD","ADMIN_PASS","ADMIN_PASSCODE","LEGACY_ADMIN_PASSWORD","PRETZEL_ADMIN_PASSWORD"]);
  if (!p) return { configured:false };
  const data = await load();
  data.users = data.users || {};
  if (!data.users[u]){
    const salt = crypto.randomBytes(8).toString("hex");
    const passHash = sha256(salt + ":" + p);
    data.users[u] = { salt, passHash, created:new Date().toISOString(), role:"owner" };
    await save(data);
  }
  return { configured:true, username:u };
}

async function login(username, password, ip){
  const cfg = await ensureDefaultUser();
  if (!cfg || cfg.configured === false) return { ok:false, code:"not_configured" };

  const data = await load();
  data.attempts = data.attempts || {};
  const key = (ip || "unknown") + ":" + String(username || "").toLowerCase();
  const now = Date.now();
  const windowMs = 10 * 60 * 1000;
  const maxFails = 7;
  const recAtt = data.attempts[key] || { fails:0, first:now, lockedUntil:0 };

  if (recAtt.lockedUntil && now < recAtt.lockedUntil){
    data.attempts[key] = recAtt;
    await save(data);
    return { ok:false, code:"locked", retryAt:recAtt.lockedUntil };
  }
  if (now - recAtt.first > windowMs){
    recAtt.fails = 0;
    recAtt.first = now;
  }

  const rec = data.users && data.users[username];
  if (!rec){
    recAtt.fails++;
    if (recAtt.fails >= maxFails) recAtt.lockedUntil = now + 15*60*1000;
    data.attempts[key] = recAtt;
    await save(data);
    return { ok:false, code:"bad_login" };
  }

  const h = sha256(rec.salt + ":" + password);
  if (h !== rec.passHash){
    recAtt.fails++;
    if (recAtt.fails >= maxFails) recAtt.lockedUntil = now + 15*60*1000;
    data.attempts[key] = recAtt;
    await save(data);
    return { ok:false, code:"bad_login" };
  }

  if (data.attempts[key]){
    delete data.attempts[key];
    await save(data);
  }
  const token = await createSession(username);
  return { ok:true, token, username };
}

module.exports = { sha256, verifySession, verifyToken, login, ensureDefaultUser };
