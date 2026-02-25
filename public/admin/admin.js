const ADMIN_KEY_STORAGE = "pretzel_admin_key_v3";
const $ = (id) => document.getElementById(id);

function setLoginStatus(text, good=false){
  const el = $("loginStatus");
  el.textContent = text;
  el.style.color = good ? "var(--good)" : "var(--muted)";
}
function setAdminStatus(text, good=false){
  const el = $("adminStatus");
  el.textContent = text;
  el.style.color = good ? "var(--good)" : "var(--muted)";
}
function msg(id, text, good=false){
  const el = $(id);
  if(!el) return;
  el.textContent = text;
  el.style.color = good ? "var(--good)" : "var(--muted)";
}

function getKey(){ return sessionStorage.getItem(ADMIN_KEY_STORAGE) || ""; }
function setKey(v){ sessionStorage.setItem(ADMIN_KEY_STORAGE, v); }
function clearKey(){ sessionStorage.removeItem(ADMIN_KEY_STORAGE); }

async function verifyKey(key){
  const res = await fetch("/.netlify/functions/verifyAdmin", {
    method: "POST",
    headers: { "content-type":"application/json", "x-admin-key": key },
    body: "{}"
  });
  const data = await res.json().catch(()=> ({}));
  if(!res.ok) throw new Error(data.error || "Invalid key");
  return true;
}

function showGate(){
  $("loginGate").style.display = "grid";
  $("adminApp").style.display = "none";
  const lo = $("logoutBtn");
  if(lo) lo.style.display = "none";
}
function showApp(){
  $("loginGate").style.display = "none";
  $("adminApp").style.display = "grid";
  const lo = $("logoutBtn");
  if(lo) lo.style.display = "inline";
}

async function api(path, body){
  const key = getKey();
  const res = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json", "x-admin-key": key },
    body: JSON.stringify(body || {})
  });
  const data = await res.json().catch(()=> ({}));
  if(!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

let STATE = null;

function populateTeams(state){
  const teams = (state.teams || []).slice().sort((a,b)=>String(a.name||"").localeCompare(String(b.name||"")));
  const teamSelects = ["teamSelect","newPlayerTeam","moveTeam"];
  teamSelects.forEach(id => {
    const sel = $(id);
    if(!sel) return;
    sel.innerHTML = "";
    teams.forEach(t => {
      const opt = document.createElement("option");
      opt.value = t.id;
      opt.textContent = t.name;
      sel.appendChild(opt);
    });
  });
}

function populatePlayers(state){
  const sel = $("playerSelect");
  if(!sel) return;
  sel.innerHTML = "";
  (state.players || [])
    .slice()
    .sort((a,b)=>String(a.name||"").localeCompare(String(b.name||"")))
    .forEach(p => {
      const opt = document.createElement("option");
      opt.value = p.id;
      opt.textContent = `${p.name} (${p.status || "alive"}) • kills:${typeof p.kills==="number"?p.kills:0}`;
      sel.appendChild(opt);
    });
}

async function loadState(){
  const res = await fetch("/.netlify/functions/getState", { cache: "no-store" });
  const state = await res.json();
  STATE = state;
  $("snapshot").textContent = JSON.stringify(state, null, 2);
  populateTeams(state);
  populatePlayers(state);
  setAdminStatus("State loaded.", true);
  return state;
}

async function seed(){
  msg("statusResult","Seeding demo data...");
  await api("/.netlify/functions/seedDemo", {});
  msg("statusResult","Seeded ✅", true);
  await loadState();
}

// TEAM actions
async function addTeam(){
  const name = $("newTeamName").value.trim();
  if(!name) return msg("teamResult","Enter a team name first.");
  msg("teamResult","Creating team...");
  await api("/.netlify/functions/addTeam", { name });
  $("newTeamName").value = "";
  msg("teamResult","Team created ✅", true);
  await loadState();
}
async function renameTeam(){
  const teamId = $("teamSelect").value;
  const name = $("renameTeam").value.trim();
  if(!teamId) return msg("teamResult","Pick a team.");
  if(!name) return msg("teamResult","Enter the new team name.");
  msg("teamResult","Renaming...");
  await api("/.netlify/functions/renameTeam", { teamId, name });
  $("renameTeam").value = "";
  msg("teamResult","Team renamed ✅", true);
  await loadState();
}
async function deleteTeam(){
  const teamId = $("teamSelect").value;
  if(!teamId) return msg("teamResult","Pick a team.");
  msg("teamResult","Deleting team...");
  await api("/.netlify/functions/deleteTeam", { teamId });
  msg("teamResult","Team deleted ✅", true);
  await loadState();
}

// PLAYER actions
async function addPlayer(){
  const name = $("newPlayerName").value.trim();
  const teamId = $("newPlayerTeam").value;
  if(!name) return msg("playerResult","Enter a player name.");
  msg("playerResult","Adding player...");
  await api("/.netlify/functions/addPlayer", { name, teamId });
  $("newPlayerName").value = "";
  msg("playerResult","Player added ✅", true);
  await loadState();
}
async function renamePlayer(){
  const playerId = $("playerSelect").value;
  const name = $("renamePlayer").value.trim();
  if(!playerId) return msg("playerResult","Pick a player.");
  if(!name) return msg("playerResult","Enter the new player name.");
  msg("playerResult","Renaming...");
  await api("/.netlify/functions/renamePlayer", { playerId, name });
  $("renamePlayer").value = "";
  msg("playerResult","Player renamed ✅", true);
  await loadState();
}
async function movePlayer(){
  const playerId = $("playerSelect").value;
  const teamId = $("moveTeam").value;
  if(!playerId) return msg("playerResult","Pick a player.");
  if(!teamId) return msg("playerResult","Pick a team.");
  msg("playerResult","Moving player...");
  await api("/.netlify/functions/movePlayer", { playerId, teamId });
  msg("playerResult","Player moved ✅", true);
  await loadState();
}
async function deletePlayer(){
  const playerId = $("playerSelect").value;
  if(!playerId) return msg("playerResult","Pick a player.");
  msg("playerResult","Removing player...");
  await api("/.netlify/functions/deletePlayer", { playerId });
  msg("playerResult","Player removed ✅", true);
  await loadState();
}

// STATUS/KILLS
async function addKill(){
  const playerId = $("playerSelect").value;
  const logText = $("logMsg").value.trim() || null;
  if(!playerId) return msg("statusResult","Pick a player first.");
  msg("statusResult","Adding kill...");
  await api("/.netlify/functions/updatePlayer", { playerId, addKill: true, logText });
  $("logMsg").value = "";
  msg("statusResult","Kill added ✅", true);
  await loadState();
}
async function applyStatus(){
  const playerId = $("playerSelect").value;
  const status = $("statusSelect").value;
  const killsRaw = $("killsSet").value.trim();
  const killsSet = killsRaw === "" ? null : Number(killsRaw);
  const logText = $("logMsg").value.trim() || null;

  if(!playerId) return msg("statusResult","Pick a player first.");
  if(killsSet !== null && (!Number.isFinite(killsSet) || killsSet < 0)) return msg("statusResult","Kills must be 0 or more.");

  msg("statusResult","Updating...");
  await api("/.netlify/functions/updatePlayer", { playerId, status, killsSet, logText });
  $("killsSet").value = "";
  $("logMsg").value = "";
  msg("statusResult","Updated ✅", true);
  await loadState();
}

function hookButtons(){
  $("load").addEventListener("click", () => loadState().catch(e => msg("statusResult", e.message)));
  $("seed").addEventListener("click", () => seed().catch(e => msg("statusResult", e.message)));

  $("refreshBtn").addEventListener("click", () => loadState().catch(e => msg("statusResult", e.message)));

  $("addTeamBtn").addEventListener("click", () => addTeam().catch(e => msg("teamResult", e.message)));
  $("renameTeamBtn").addEventListener("click", () => renameTeam().catch(e => msg("teamResult", e.message)));
  $("deleteTeamBtn").addEventListener("click", () => deleteTeam().catch(e => msg("teamResult", e.message)));

  $("addPlayerBtn").addEventListener("click", () => addPlayer().catch(e => msg("playerResult", e.message)));
  $("renamePlayerBtn").addEventListener("click", () => renamePlayer().catch(e => msg("playerResult", e.message)));
  $("movePlayerBtn").addEventListener("click", () => movePlayer().catch(e => msg("playerResult", e.message)));
  $("deletePlayerBtn").addEventListener("click", () => deletePlayer().catch(e => msg("playerResult", e.message)));

  $("addKillBtn").addEventListener("click", () => addKill().catch(e => msg("statusResult", e.message)));
  $("applyStatusBtn").addEventListener("click", () => applyStatus().catch(e => msg("statusResult", e.message)));
}

async function doLogin(){
  const key = $("key").value.trim();
  if(!key) return setLoginStatus("Enter a key.", false);

  setLoginStatus("Checking…");
  try{
    await verifyKey(key);
    setKey(key);
    setLoginStatus("Unlocked ✅", true);
    showApp();
    setAdminStatus("Authenticated.", true);
    hookButtons();
    await loadState();
  }catch(e){
    setLoginStatus(e.message || "Invalid key", false);
    showGate();
  }
}

function doLogout(){
  clearKey();
  $("key").value = "";
  setLoginStatus("Locked", false);
  showGate();
}

async function init(){
  $("loginBtn").addEventListener("click", () => doLogin());
  $("clearBtn").addEventListener("click", () => { $("key").value=""; setLoginStatus("Cleared", true); });
  $("key").addEventListener("keydown", (e) => { if(e.key === "Enter") doLogin(); });

  const logoutBtn = $("logoutBtn");
  if(logoutBtn){
    logoutBtn.addEventListener("click", (e) => { e.preventDefault(); doLogout(); });
  }

  const existing = getKey();
  if(existing){
    $("key").value = existing;
    setLoginStatus("Checking saved key…");
    try{
      await verifyKey(existing);
      showApp();
      setAdminStatus("Authenticated.", true);
      hookButtons();
      await loadState();
      setLoginStatus("Unlocked ✅", true);
    }catch{
      doLogout();
    }
  } else {
    showGate();
  }
}
init();
