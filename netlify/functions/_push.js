const webpush = require("web-push");
const { getStore } = require("@netlify/blobs");

const SUB_STORE = "pretzel-hq";
const SUB_KEY = "push_subs_v1";

function store() {
  const siteID = process.env.NETLIFY_SITE_ID || process.env.BLOBS_SITE_ID || "";
  const token  = process.env.NETLIFY_AUTH_TOKEN || process.env.BLOBS_TOKEN || "";
  // If the environment isn't auto-configured for Blobs (common in some deploy modes),
  // passing siteID+token enables manual configuration.
  if(siteID && token){
    try { return getStore({ name: "pretzel-hq", siteID, token, consistency: "strong" }); }
    catch(e) { return getStore({ name: "pretzel-hq", siteID, token }); }
  }
  // Auto-configured path
  try { return getStore({ name: "pretzel-hq", consistency: "strong" }); }
  catch(e) { return getStore("pretzel-hq"); }
}

async function loadSubs(){
  const st = store();
  const raw = await st.get(SUB_KEY, { type: "json" });
  return raw || { subs: [] };
}

async function saveSubs(obj){
  const st = store();
  if(typeof st.setJSON === "function") await st.setJSON(SUB_KEY, obj);
  else await st.set(SUB_KEY, JSON.stringify(obj), { contentType:"application/json" });
  return obj;
}

function cfgWebPush(){
  const pub = process.env.VAPID_PUBLIC_KEY || "";
  const priv = process.env.VAPID_PRIVATE_KEY || "";
  const contact = process.env.VAPID_SUBJECT || "mailto:admin@example.com";
  if(!pub || !priv) throw new Error("Missing VAPID keys");
  webpush.setVapidDetails(contact, pub, priv);
  return { pub };
}

function normSub(s){
  // keep only needed fields
  return {
    endpoint: s.endpoint,
    keys: s.keys ? { p256dh: s.keys.p256dh, auth: s.keys.auth } : undefined,
    tags: Array.isArray(s.tags) ? s.tags.slice(0, 10).map(String) : []
  };
}

async function addSub(subscription, tags=[]){
  const clean = normSub({ ...subscription, tags });
  if(!clean.endpoint || !clean.keys?.p256dh || !clean.keys?.auth){
    throw new Error("Invalid subscription");
  }
  const data = await loadSubs();
  data.subs = Array.isArray(data.subs) ? data.subs : [];
  // dedupe by endpoint
  data.subs = data.subs.filter(x => x && x.endpoint !== clean.endpoint);
  data.subs.push(clean);
  // cap
  if(data.subs.length > 250) data.subs = data.subs.slice(data.subs.length - 250);
  await saveSubs(data);
  return data.subs.length;
}

async function removeSub(endpoint){
  const data = await loadSubs();
  data.subs = (data.subs || []).filter(x => x && x.endpoint !== endpoint);
  await saveSubs(data);
  return data.subs.length;
}

function matchTags(sub, wanted){
  if(!wanted || !wanted.length) return true;
  const set = new Set((sub.tags||[]).map(t=>String(t).toLowerCase()));
  return wanted.some(t => set.has(String(t).toLowerCase()));
}

async function sendToSubs(payload, { tags=[] } = {}){
  cfgWebPush();
  const data = await loadSubs();
  let ok = 0, fail = 0;
  const keep = [];
  for(const sub of (data.subs || [])){
    if(!sub?.endpoint) continue;
    if(!matchTags(sub, tags)) { keep.push(sub); continue; }
    try{
      await webpush.sendNotification(sub, JSON.stringify(payload));
      ok++;
      keep.push(sub);
    }catch(e){
      // 410/404 = gone, drop it
      const code = e?.statusCode || e?.status;
      if(code === 410 || code === 404){
        fail++;
      } else {
        fail++;
        keep.push(sub); // keep for transient errors
      }
    }
  }
  data.subs = keep;
  await saveSubs(data);
  return { ok, fail, total: (data.subs||[]).length };
}

module.exports = { cfgWebPush, addSub, removeSub, sendToSubs, loadSubs };
