const RELEASE_DATE = new Date("2026-03-09T15:30:00-06:00");
const $ = (id) => document.getElementById(id);

let filter = "all";
let lastState = null;

function escapeHtml(str){
  return String(str ?? "")
    .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
    .replaceAll('"',"&quot;").replaceAll("'","&#039;");
}

function fmtTime(ts){
  try{
    const d = new Date(ts);
    return d.toLocaleString(undefined, { hour: "numeric", minute: "2-digit" });
  }catch{ return "—"; }
}

function countdownParts(ms){
  const s = Math.max(0, Math.floor(ms/1000));
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  return {days, hours, mins, secs};
}

function renderTimer(){
  const now = new Date();
  const delta = RELEASE_DATE - now;
  const p = countdownParts(delta);

  const timer = $("timer");
  timer.innerHTML = "";
  [
    { num: p.days, lbl: "DAYS" },
    { num: p.hours, lbl: "HOURS" },
    { num: p.mins, lbl: "MIN" },
    { num: p.secs, lbl: "SEC" },
  ].forEach(b => {
    const el = document.createElement("div");
    el.className = "timebox";
    el.innerHTML = `<div class="num">${String(b.num).padStart(2,"0")}</div><div class="lbl">${b.lbl}</div>`;
    timer.appendChild(el);
  });

  const unlocked = now >= RELEASE_DATE;
  $("revealTitle").textContent = unlocked ? "HQ Live" : "Countdown Lock";
  $("revealBadge").textContent = unlocked ? "UNLOCKED" : "LOCKED";
  $("revealFoot").textContent = unlocked ? "Live board is active." : "HQ unlocks March 9 at 3:30 PM (America/Chicago)";

  $("lockedNotice").style.display = unlocked ? "none" : "grid";
  $("liveBoard").style.display = unlocked ? "grid" : "none";
  $("statsRow").style.display = unlocked ? "grid" : "none";
  return unlocked;
}

async function fetchState(){
  const res = await fetch("/.netlify/functions/getState", { cache: "no-store" });
  if(!res.ok) throw new Error("Failed to load state");
  return await res.json();
}

function statusBadge(status){
  const s = (status || "alive").toLowerCase();
  if(s === "alive") return `<span class="badge b-alive">ALIVE</span>`;
  if(s === "pending") return `<span class="badge b-pending">PENDING</span>`;
  if(s === "eliminated") return `<span class="badge b-elim">ELIMINATED</span>`;
  if(s === "revived") return `<span class="badge b-rev">REVIVED</span>`;
  return `<span class="badge">UNKNOWN</span>`;
}

function teamPill(aliveCount, total){
  if(aliveCount <= 0) return `<span class="team-pill" style="border-color:rgba(255,77,109,.35);background:rgba(255,77,109,.10)">WIPED</span>`;
  if(aliveCount === total && total > 0) return `<span class="team-pill" style="border-color:rgba(53,208,127,.35);background:rgba(53,208,127,.10)">FULL</span>`;
  return `<span class="team-pill" style="border-color:rgba(255,209,102,.35);background:rgba(255,209,102,.10)">ACTIVE</span>`;
}

function render(state){
  const feed = $("feed");
  const logs = (state.log || []).slice().reverse().slice(0, 10);
  feed.innerHTML = logs.length
    ? ""
    : `<div class="feed-item"><div class="feed-text">No updates yet</div><div class="feed-time">—</div></div>`;

  logs.forEach(item => {
    const el = document.createElement("div");
    el.className = "feed-item";
    el.innerHTML = `
      <div class="feed-top">
        <div class="feed-text">${escapeHtml(item.text || "")}</div>
        <div class="feed-time">${fmtTime(item.ts)}</div>
      </div>`;
    feed.appendChild(el);
  });

  const teams = state.teams || [];
  const players = state.players || [];
  const teamMap = new Map(teams.map(t => [t.id, t]));
  const byTeam = new Map();
  players.forEach(p => {
    const arr = byTeam.get(p.teamId) || [];
    arr.push(p);
    byTeam.set(p.teamId, arr);
  });

  const alivePlayers = players.filter(p => (p.status || "alive") === "alive" || p.status === "revived").length;
  const activeTeams = teams.filter(t => {
    const ps = byTeam.get(t.id) || [];
    const alive = ps.filter(p => (p.status || "alive") === "alive" || p.status === "revived").length;
    return alive > 0;
  }).length;
  const elims = players.filter(p => p.status === "eliminated").length;

  $("statPlayers").textContent = String(alivePlayers);
  $("statTeams").textContent = String(activeTeams);
  $("statElims").textContent = String(elims);
  $("statUpdated").textContent = state.lastUpdated ? fmtTime(state.lastUpdated) : "—";

  const teamsEl = $("teams");
  teamsEl.innerHTML = "";
  teams
    .map(t => {
      const ps = (byTeam.get(t.id) || []).slice().sort((a,b)=>String(a.name||"").localeCompare(String(b.name||"")));
      const total = ps.length;
      const alive = ps.filter(p => (p.status || "alive") === "alive" || p.status === "revived").length;
      const pct = total > 0 ? Math.round((alive/total)*100) : 0;
      return { t, ps, total, alive, pct };
    })
    .sort((a,b)=> b.alive - a.alive || b.total - a.total || String(a.t.name||"").localeCompare(String(b.t.name||"")))
    .forEach(tc => {
      const rosterTags = tc.ps.slice(0, 8).map(p => `<span class="tag">${escapeHtml(p.name||"")}</span>`).join("");
      const overflow = tc.ps.length > 8 ? `<span class="tag">+${tc.ps.length - 8}</span>` : "";
      const card = document.createElement("div");
      card.className = "team-card";
      card.innerHTML = `
        <div class="team-top">
          <div>
            <div class="team-name">${escapeHtml(tc.t.name||"")}</div>
            <div class="team-meta">Alive: <b>${tc.alive}/${tc.total}</b> • ${tc.pct}%</div>
          </div>
          ${teamPill(tc.alive, tc.total)}
        </div>
        <div class="bar"><div style="width:${tc.pct}%"></div></div>
        <div class="team-roster">${rosterTags}${overflow}</div>
      `;
      teamsEl.appendChild(card);
    });

  const playersEl = $("players");
  playersEl.innerHTML = "";
  players
    .filter(p => filter === "all" ? true : (p.status || "alive") === filter)
    .slice()
    .sort((a,b) => String(a.name||"").localeCompare(String(b.name||"")))
    .forEach(p => {
      const t = teamMap.get(p.teamId);
      const row = document.createElement("div");
      row.className = "player";
      row.innerHTML = `
        <div class="p-left">
          <div class="p-name">${escapeHtml(p.name||"")}</div>
          <div class="p-sub">${escapeHtml(t ? t.name : "No team")}${typeof p.kills === "number" ? ` • Kills: ${p.kills}` : ""}</div>
        </div>
        ${statusBadge(p.status)}
      `;
      playersEl.appendChild(row);
    });
}

function hookFilters(){
  document.querySelectorAll(".fbtn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".fbtn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      filter = btn.dataset.filter;
      if(lastState) render(lastState);
    });
  });
}

function setupInstall(){
  let deferredPrompt = null;
  const btn = document.getElementById("installBtn");
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    btn.style.display = "inline";
  });
  btn?.addEventListener("click", async (e) => {
    e.preventDefault();
    if(!deferredPrompt) return;
    deferredPrompt.prompt();
    deferredPrompt = null;
    btn.style.display = "none";
  });
}

async function tick(){
  try{
    const state = await fetchState();
    lastState = state;
    if(renderTimer()) render(state);
  }catch(e){
    console.error(e);
  }
}

async function main(){
  if("serviceWorker" in navigator){
    try{ await navigator.serviceWorker.register("/sw.js"); }catch{}
  }
  setupInstall();
  hookFilters();
  renderTimer();
  setInterval(renderTimer, 1000);

  await tick();
  setInterval(tick, 5000);
}
main();


// --- PUSH NOTIFICATIONS (Option B) ---
let PUSH_SUB = null;

async function getPublicKey(){
  const res = await fetch("/.netlify/functions/getVapidPublicKey", { cache:"no-store" });
  const data = await res.json();
  if(!res.ok) throw new Error(data.detail || "Push not configured");
  return data.publicKey;
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

async function enableNotifications(){
  if(!("serviceWorker" in navigator)) throw new Error("No service worker");
  if(!("PushManager" in window)) throw new Error("Push not supported");

  const perm = await Notification.requestPermission();
  if(perm !== "granted") throw new Error("Permission denied");

  const reg = await navigator.serviceWorker.ready;
  const pub = await getPublicKey();
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(pub)
  });
  PUSH_SUB = sub;

  // Tags: all + optional team tags later
  await fetch("/.netlify/functions/subscribePush", {
    method:"POST",
    headers:{ "content-type":"application/json" },
    body: JSON.stringify({ subscription: sub, tags: ["all"] })
  });

  localStorage.setItem("pretzel_push_on", "1");
  showNotifUI();
}

async function disableNotifications(){
  try{
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if(sub){
      await fetch("/.netlify/functions/unsubscribePush", {
        method:"POST",
        headers:{ "content-type":"application/json" },
        body: JSON.stringify({ endpoint: sub.endpoint })
      });
      await sub.unsubscribe();
    }
  }catch{}
  localStorage.removeItem("pretzel_push_on");
  showNotifUI();
}

async function showNotifUI(){
  const box = document.getElementById("notifBox");
  if(!box) return;

  let supported = ("serviceWorker" in navigator) && ("PushManager" in window);
  if(!supported){
    box.innerHTML = `<div class="panel"><div class="panel-head"><div class="panel-title">Notifications</div><div class="panel-note">Not supported on this browser</div></div><div style="padding:14px 16px; color:var(--muted);">Use Safari/Chrome and install to Home Screen on iPhone.</div></div>`;
    return;
  }

  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  const on = !!sub && localStorage.getItem("pretzel_push_on")==="1";

  box.innerHTML = `
    <div class="panel">
      <div class="panel-head">
        <div class="panel-title">Notifications</div>
        <div class="panel-note">${on ? "Enabled" : "Disabled"}</div>
      </div>
      <div style="padding:14px 16px; display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
        <button class="fbtn ${on ? "active" : ""}" id="notifToggle">${on ? "Disable" : "Enable"} Notifications</button>
        <div class="panel-note">iPhone: Add to Home Screen first.</div>
      </div>
    </div>
  `;

  document.getElementById("notifToggle")?.addEventListener("click", async () => {
    try{
      if(on) await disableNotifications();
      else await enableNotifications();
    }catch(e){
      alert(e.message || "Failed");
    }
  });
}


// --- Notification Control Center (Push Upgrades) ---
async function notifLoadTeams(){
  try{
    const st = await (await fetch("/.netlify/functions/getState", { cache:"no-store" })).json();
    return (st.teams || []).slice().sort((a,b)=>String(a.name||"").localeCompare(String(b.name||"")));
  }catch{ return []; }
}

async function notifGetPublicKey(){
  const res = await fetch("/.netlify/functions/getVapidPublicKey", { cache:"no-store" });
  const data = await res.json();
  if(!res.ok) throw new Error(data.detail || "Push not configured");
  return data.publicKey;
}

function b64ToUint8(base64String){
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for(let i=0;i<raw.length;i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function notifSubscribe(tags){
  if(!("serviceWorker" in navigator) || !("PushManager" in window)) throw new Error("Push not supported");
  const perm = await Notification.requestPermission();
  if(perm !== "granted") throw new Error("Notifications blocked");

  const reg = await navigator.serviceWorker.ready;
  const pub = await notifGetPublicKey();
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly:true,
    applicationServerKey: b64ToUint8(pub)
  });

  await fetch("/.netlify/functions/subscribePush", {
    method:"POST",
    headers:{ "content-type":"application/json" },
    body: JSON.stringify({ subscription: sub, tags })
  });

  localStorage.setItem("pretzel_push_tags", JSON.stringify(tags));
  return sub;
}

async function notifUnsubscribe(){
  try{
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if(sub){
      await fetch("/.netlify/functions/unsubscribePush", {
        method:"POST",
        headers:{ "content-type":"application/json" },
        body: JSON.stringify({ endpoint: sub.endpoint })
      });
      await sub.unsubscribe();
    }
  }catch{}
  localStorage.removeItem("pretzel_push_tags");
}

async function renderNotifBox(){
  const box = document.getElementById("notifBox");
  if(!box) return;

  const supported = ("serviceWorker" in navigator) && ("PushManager" in window);
  const teams = await notifLoadTeams();

  if(!supported){
    box.innerHTML = `
      <div class="panel">
        <div class="panel-head">
          <div class="panel-title">Notification Control Center</div>
          <div class="panel-note">Not supported</div>
        </div>
        <div style="padding:14px 16px; color:var(--muted);">
          iPhone: Add to Home Screen first. Use Safari/Chrome.
        </div>
      </div>`;
    return;
  }

  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  const on = !!sub;

  const saved = (()=>{ try{ return JSON.parse(localStorage.getItem("pretzel_push_tags")||"[]"); }catch{ return []; }})();
  const savedTeam = saved.find(t=>String(t).startsWith("team:")) || "";
  const savedMode = saved.includes("big") ? "big" : "all";

  const teamOptions = [`<option value="">Everyone</option>`].concat(
    teams.map(t => `<option value="team:${t.id}" ${savedTeam===`team:${t.id}`?"selected":""}>Team ${t.name}</option>`)
  ).join("");

  box.innerHTML = `
    <div class="panel">
      <div class="panel-head">
        <div class="panel-title">Notification Control Center</div>
        <div class="panel-note">${on ? "Armed" : "Offline"}</div>
      </div>
      <div style="padding:14px 16px; display:grid; gap:10px;">
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
          <div>
            <div class="panel-note" style="margin-bottom:6px;">Follow</div>
            <select id="notifTeam" style="width:100%; padding:12px; border-radius:14px; border:1px solid rgba(255,255,255,.10); background:rgba(0,0,0,.22); color:var(--text); outline:none;">
              ${teamOptions}
            </select>
          </div>
          <div>
            <div class="panel-note" style="margin-bottom:6px;">Mode</div>
            <select id="notifMode" style="width:100%; padding:12px; border-radius:14px; border:1px solid rgba(255,255,255,.10); background:rgba(0,0,0,.22); color:var(--text); outline:none;">
              <option value="all" ${savedMode==="all"?"selected":""}>All events</option>
              <option value="big" ${savedMode==="big"?"selected":""}>Big events only</option>
            </select>
          </div>
        </div>

        <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
          <button class="fbtn ${on?"active":""}" id="notifToggle">${on ? "Disable" : "Enable"} Notifications</button>
          <button class="fbtn" id="notifSave" style="border-color:rgba(255,209,102,.35); background:rgba(255,209,102,.10);">Save Settings</button>
          <div class="panel-note">iPhone: Add to Home Screen first.</div>
        </div>
      </div>
    </div>
  `;

  document.getElementById("notifToggle")?.addEventListener("click", async ()=>{
    try{
      if(on){
        await notifUnsubscribe();
        await renderNotifBox();
      } else {
        const team = document.getElementById("notifTeam").value;
        const mode = document.getElementById("notifMode").value;
        const tags = ["all"].concat(team? [team] : []).concat(mode==="big"?["big"]:[]);
        await notifSubscribe(tags);
        await renderNotifBox();
      }
    }catch(e){ alert(e.message || "Failed"); }
  });

  document.getElementById("notifSave")?.addEventListener("click", async ()=>{
    try{
      if(!on){ alert("Enable notifications first."); return; }
      // simplest: re-subscribe with new tags
      await notifUnsubscribe();
      const team = document.getElementById("notifTeam").value;
      const mode = document.getElementById("notifMode").value;
      const tags = ["all"].concat(team? [team] : []).concat(mode==="big"?["big"]:[]);
      await notifSubscribe(tags);
      alert("Saved ✅");
      await renderNotifBox();
    }catch(e){ alert(e.message || "Failed"); }
  });
}

// call on load (safe)
(async ()=>{ try{ await renderNotifBox(); }catch{} })();
