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
