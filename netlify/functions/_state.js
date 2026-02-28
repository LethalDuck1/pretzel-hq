const { getStore } = require("@netlify/blobs");

const STORE = "pretzel-hq";
const STATE_KEY = "state_v1";

/**
 * Compatibility wrapper:
 * Netlify's Blobs SDK has had a couple different getStore() signatures over time.
 * This tries the newest signature first, then falls back.
 */
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

function json(statusCode, obj) {
  return {
    statusCode,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(obj)
  };
}

function isAdmin(event) {
  const adminKey = process.env.ADMIN_KEY || "";
  const provided = event.headers["x-admin-key"] || event.headers["X-Admin-Key"] || "";
  return adminKey && provided && String(provided) === String(adminKey);
}

function mkId(prefix){
  return `${prefix}_${Math.random().toString(16).slice(2,10)}${Math.random().toString(16).slice(2,6)}`;
}

function normStatus(s){
  const v = String(s || "alive").toLowerCase();
  const allowed = new Set(["alive","pending","eliminated","revived"]);
  return allowed.has(v) ? v : "alive";
}

async function loadState() {
  const st = store();
  const raw = await st.get(STATE_KEY, { type: "json" });
  if (raw) return raw;

  return {
    lastUpdated: null,
    teams: [],
    players: [],
    log: []
  };
}

async function saveState(state) {
  const st = store();
  state.lastUpdated = new Date().toISOString();
  state.log = Array.isArray(state.log) ? state.log : [];
  if (state.log.length > 200) state.log = state.log.slice(state.log.length - 200);

  // Prefer setJSON if present, else fall back to set(string)
  if (typeof st.setJSON === "function") {
    await st.setJSON(STATE_KEY, state);
  } else {
    await st.set(STATE_KEY, JSON.stringify(state), { contentType: "application/json" });
  }
  return state;
}

function pushLog(state, text){
  state.log = Array.isArray(state.log) ? state.log : [];
  state.log.push({ ts: new Date().toISOString(), text: String(text).slice(0, 140) });
}

function countTeamMembers(state, teamId){
  return (state.players || []).filter(p => p.teamId === teamId).length;
}

module.exports = {
  json, isAdmin, mkId, normStatus,
  loadState, saveState, pushLog, countTeamMembers
};
