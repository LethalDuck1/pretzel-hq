const ADMIN_KEY_STORAGE = "pretzel_admin_key_v3";
const $ = (id) => document.getElementById(id);

function toast(text, kind="info"){
  const box = document.getElementById("toast");
  if(!box) return;
  const el = document.createElement("div");
  const palette = {
    info: "border-color:rgba(255,255,255,.12);background:rgba(0,0,0,.35);",
    ok: "border-color:rgba(53,208,127,.35);background:rgba(53,208,127,.10);",
    warn:"border-color:rgba(255,209,102,.35);background:rgba(255,209,102,.10);",
    bad: "border-color:rgba(255,77,109,.35);background:rgba(255,77,109,.10);"
  };
  el.setAttribute("style",
    `padding:10px 12px;border-radius:14px;border:1px solid rgba(255,255,255,.10);${palette[kind]||palette.info}color:var(--text);box-shadow:0 12px 30px rgba(0,0,0,.35);max-width:360px;`
  );
  el.textContent = text;
  box.appendChild(el);
  setTimeout(()=> el.style.opacity="0", 2400);
  setTimeout(()=> el.remove(), 2900);
}

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

function populatePlayers(state, query=""){
  const sel = $("playerSelect");
  if(!sel) return;
  sel.innerHTML = "";
  const q = query.trim().toLowerCase();
  (state.players || [])
    .slice()
    .filter(p => !q || String(p.name||"").toLowerCase().includes(q))
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
  const snap = $("snapshot");
  if(snap) snap.textContent = JSON.stringify(state, null, 2);
  populateTeams(state);
  populatePlayers(state, $("playerSearch")?.value || "");
  setAdminStatus("State loaded.", true);
  return state;
}

async function seed(){
  msg("statusResult","Seeding demo data...");
  await api("/.netlify/functions/seedDemo", {});
  toast("Seeded demo data", "ok");
  msg("statusResult","Seeded ✅", true);
  await loadState();
}

async function resetAll(){
  if(!confirm("Reset EVERYTHING? This clears teams, players, and log.")) return;
  msg("statusResult","Resetting...");
  await api("/.netlify/functions/resetGame", { keepTeams:false });
  toast("Game reset", "warn");
  await loadState();
}

// TEAM actions
async function addTeam(){
  const name = $("newTeamName").value.trim();
  if(!name) return msg("teamResult","Enter a team name first.");
  msg("teamResult","Creating team...");
  await api("/.netlify/functions/addTeam", { name });
  $("newTeamName").value = "";
  toast(`Team created: ${name}`, "ok");
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
  toast("Team renamed", "ok");
  msg("teamResult","Team renamed ✅", true);
  await loadState();
}
async function deleteTeam(){
  const teamId = $("teamSelect").value;
  if(!teamId) return msg("teamResult","Pick a team.");
  if(!confirm("Delete this team? Players will become unassigned.")) return;
  msg("teamResult","Deleting team...");
  await api("/.netlify/functions/deleteTeam", { teamId });
  toast("Team deleted", "warn");
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
  toast(`Player added: ${name}`, "ok");
  msg("playerResult","Player added ✅", true);
  await loadState();
}

function parseNames(text){
  return text
    .split(/\r?\n|,/g)
    .map(s => s.trim())
    .filter(Boolean)
    .slice(0, 120);
}

async function bulkAddPlayers(){
  const raw = $("bulkPlayers").value || "";
  const teamId = $("bulkTeam").value;
  const names = parseNames(raw);
  if(!names.length) return toast("Paste some names first.", "warn");

  let ok = 0, fail = 0;
  for(const n of names){
    try{
      await api("/.netlify/functions/addPlayer", { name:n, teamId });
      ok++;
    }catch(e){
      fail++;
    }
  }
  toast(`Bulk add done • ok:${ok} fail:${fail}`, fail ? "warn" : "ok");
  $("bulkPlayers").value = "";
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
  toast("Player renamed", "ok");
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
  toast("Player moved", "ok");
  msg("playerResult","Player moved ✅", true);
  await loadState();
}
async function deletePlayer(){
  const playerId = $("playerSelect").value;
  if(!playerId) return msg("playerResult","Pick a player.");
  if(!confirm("Remove this player?")) return;
  msg("playerResult","Removing player...");
  await api("/.netlify/functions/deletePlayer", { playerId });
  toast("Player removed", "warn");
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
  toast("+1 kill", "ok");
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
  toast("Player updated", "ok");
  msg("statusResult","Updated ✅", true);
  await loadState();
}

function injectPowerTools(){
  // Add search + bulk UI + reset button into existing page without making you edit HTML manually.
  const controls = document.querySelector("#adminApp .panel.big > div");
  if(!controls) return;

  // Search row
  const searchWrap = document.createElement("div");
  searchWrap.className = "panel";
  searchWrap.style.borderRadius = "16px";
  searchWrap.innerHTML = `
    <div class="panel-head">
      <div class="panel-title">Power Tools</div>
      <div class="panel-note">Fast search + bulk add</div>
    </div>
    <div style="padding:14px 16px; display:grid; gap:10px;">
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
        <div>
          <div class="panel-note" style="margin-bottom:6px;">Search players</div>
          <input id="playerSearch" placeholder="Type to filter dropdown…"
            style="width:100%; padding:12px; border-radius:14px; border:1px solid rgba(255,255,255,.10); background:rgba(0,0,0,.22); color:var(--text); outline:none;">
        </div>
        <div style="display:flex; align-items:end; gap:10px; flex-wrap:wrap;">
          <button id="resetBtn" class="fbtn" style="padding:12px 14px; border-color:rgba(255,209,102,.35); background:rgba(255,209,102,.10); color:var(--text);">Reset Game</button>
        </div>
      </div>

      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
        <div>
          <div class="panel-note" style="margin-bottom:6px;">Bulk add players (comma or new line)</div>
          <textarea id="bulkPlayers" rows="4" placeholder="Ava\nBen\nCody\n…"
            style="width:100%; padding:12px; border-radius:14px; border:1px solid rgba(255,255,255,.10); background:rgba(0,0,0,.22); color:var(--text); outline:none; resize:vertical;"></textarea>
        </div>
        <div>
          <div class="panel-note" style="margin-bottom:6px;">Bulk team</div>
          <select id="bulkTeam"
            style="width:100%; padding:12px; border-radius:14px; border:1px solid rgba(255,255,255,.10); background:rgba(0,0,0,.22); color:var(--text); outline:none;"></select>
          <div style="margin-top:10px; display:flex; gap:10px; flex-wrap:wrap;">
            <button id="bulkAddBtn" class="fbtn" style="padding:12px 14px;">Bulk Add</button>
          </div>
          <div class="panel-note" style="margin-top:8px;">Note: teams cap at 5 — overflow will fail and be counted.</div>
        </div>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
        <div>
          <div class="panel-note" style="margin-bottom:6px;">Push title</div>
          <input id="pushTitle" placeholder="Pretzel HQ"
            style="width:100%; padding:12px; border-radius:14px; border:1px solid rgba(255,255,255,.10); background:rgba(0,0,0,.22); color:var(--text); outline:none;">
        </div>
        <div>
          <div class="panel-note" style="margin-bottom:6px;">Push message</div>
          <input id="pushMsg" placeholder="Test ping from HQ…"
            style="width:100%; padding:12px; border-radius:14px; border:1px solid rgba(255,255,255,.10); background:rgba(0,0,0,.22); color:var(--text); outline:none;">
        </div>
      </div>
      <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
        <button id="pushTestBtn" class="fbtn" style="padding:12px 14px; border-color:rgba(53,208,127,.35); background:rgba(53,208,127,.10);">Send Test Push</button>
        <div class="panel-note">Sends to subscribers (tag: all). Perfect for verifying phones.</div>
      </div>
    </div>
  `;
  // Put it right after the Load/Seed button row
  const firstRow = controls.firstElementChild;
  if(firstRow && !document.getElementById("playerSearch")){
    controls.insertBefore(searchWrap, firstRow.nextSibling);
  }
}

function syncBulkTeamOptions(){
  const a = $("newPlayerTeam");
  const b = $("bulkTeam");
  if(!a || !b) return;
  b.innerHTML = a.innerHTML;
}

function hookButtons(){
  $("load").addEventListener("click", () => loadState().then(()=>toast("Loaded","ok")).catch(e => { msg("statusResult", e.message); toast(e.message,"bad"); }));
  $("seed").addEventListener("click", () => seed().catch(e => { msg("statusResult", e.message); toast(e.message,"bad"); }));

  $("refreshBtn").addEventListener("click", () => loadState().then(()=>toast("Refreshed","ok")).catch(e => { msg("statusResult", e.message); toast(e.message,"bad"); }));

  $("addTeamBtn").addEventListener("click", () => addTeam().catch(e => { msg("teamResult", e.message); toast(e.message,"bad"); }));
  $("renameTeamBtn").addEventListener("click", () => renameTeam().catch(e => { msg("teamResult", e.message); toast(e.message,"bad"); }));
  $("deleteTeamBtn").addEventListener("click", () => deleteTeam().catch(e => { msg("teamResult", e.message); toast(e.message,"bad"); }));

  $("addPlayerBtn").addEventListener("click", () => addPlayer().catch(e => { msg("playerResult", e.message); toast(e.message,"bad"); }));
  $("renamePlayerBtn").addEventListener("click", () => renamePlayer().catch(e => { msg("playerResult", e.message); toast(e.message,"bad"); }));
  $("movePlayerBtn").addEventListener("click", () => movePlayer().catch(e => { msg("playerResult", e.message); toast(e.message,"bad"); }));
  $("deletePlayerBtn").addEventListener("click", () => deletePlayer().catch(e => { msg("playerResult", e.message); toast(e.message,"bad"); }));

  $("addKillBtn").addEventListener("click", () => addKill().catch(e => { msg("statusResult", e.message); toast(e.message,"bad"); }));
  $("applyStatusBtn").addEventListener("click", () => applyStatus().catch(e => { msg("statusResult", e.message); toast(e.message,"bad"); }));
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

    injectPowerTools();
    hookButtons();

    await loadState();
    syncBulkTeamOptions();

    // Hook power tools
    $("resetBtn")?.addEventListener("click", ()=> resetAll().catch(e=>toast(e.message,"bad")));
    $("bulkAddBtn")?.addEventListener("click", ()=> bulkAddPlayers().catch(e=>toast(e.message,"bad")));
    $("playerSearch")?.addEventListener("input", ()=> populatePlayers(STATE || {players:[]}, $("playerSearch").value));
    toast("Admin unlocked", "ok");
    // Push test button
    document.getElementById("pushTestBtn")?.addEventListener("click", async ()=>{
      try{
        const title = document.getElementById("pushTitle")?.value || "Pretzel HQ";
        const message = document.getElementById("pushMsg")?.value || "Test notification";
        const data = await api("/.netlify/functions/pushTest", { title, message, tags:["all"] });
        toast(`Push sent • ok:${data.ok} fail:${data.fail}`, data.fail ? "warn" : "ok");
      }catch(e){ toast(e.message || "Push failed", "bad"); }
    });

  }catch(e){
    setLoginStatus(e.message || "Invalid key", false);
    toast(e.message || "Invalid key", "bad");
    showGate();
  }
}

function doLogout(){
  clearKey();
  $("key").value = "";
  setLoginStatus("Locked", false);
  showGate();
  toast("Logged out", "info");
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

      injectPowerTools();
      hookButtons();

      await loadState();
      syncBulkTeamOptions();

      $("resetBtn")?.addEventListener("click", ()=> resetAll().catch(e=>toast(e.message,"bad")));
      $("bulkAddBtn")?.addEventListener("click", ()=> bulkAddPlayers().catch(e=>toast(e.message,"bad")));
      $("playerSearch")?.addEventListener("input", ()=> populatePlayers(STATE || {players:[]}, $("playerSearch").value));

      setLoginStatus("Unlocked ✅", true);
      toast("Admin unlocked", "ok");
    // Push test button
    document.getElementById("pushTestBtn")?.addEventListener("click", async ()=>{
      try{
        const title = document.getElementById("pushTitle")?.value || "Pretzel HQ";
        const message = document.getElementById("pushMsg")?.value || "Test notification";
        const data = await api("/.netlify/functions/pushTest", { title, message, tags:["all"] });
        toast(`Push sent • ok:${data.ok} fail:${data.fail}`, data.fail ? "warn" : "ok");
      }catch(e){ toast(e.message || "Push failed", "bad"); }
    });

    }catch{
      doLogout();
    }
  } else {
    showGate();
  }
}
init();
