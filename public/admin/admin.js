const __t=localStorage.getItem("pretzel_admin_token")||"";const ADMIN_KEY_STORAGE="pretzel_admin_key_v3";const $=(id)=>document.getElementById(id);function toast(text,kind="info"){const box=document.getElementById("toast");if(!box)return;const el=document.createElement("div");const palette={info:"border-color:rgba(255,255,255,.12);background:rgba(0,0,0,.35);",ok:"border-color:rgba(53,208,127,.35);background:rgba(53,208,127,.10);",warn:"border-color:rgba(255,209,102,.35);background:rgba(255,209,102,.10);",bad:"border-color:rgba(255,77,109,.35);background:rgba(255,77,109,.10);"};el.setAttribute("style",`padding:10px 12px;border-radius:14px;border:1px solid rgba(255,255,255,.10);${palette[kind]||palette.info}color:var(--text);box-shadow:0 12px 30px rgba(0,0,0,.35);max-width:360px;`);el.textContent=text;box.appendChild(el);setTimeout(()=>el.style.opacity="0",2400);setTimeout(()=>el.remove(),2900);}function setLoginStatus(text,good=false){const el=$("loginStatus");el.textContent=text;el.style.color=good ? "var(--good)":"var(--muted)";}function setAdminStatus(text,good=false){const el=$("adminStatus");el.textContent=text;el.style.color=good ? "var(--good)":"var(--muted)";}function msg(id,text,good=false){const el=$(id);if(!el)return;el.textContent=text;el.style.color=good ? "var(--good)":"var(--muted)";}function getKey(){return sessionStorage.getItem(ADMIN_KEY_STORAGE)|| "";}function setKey(v){sessionStorage.setItem(ADMIN_KEY_STORAGE,v);}function clearKey(){sessionStorage.removeItem(ADMIN_KEY_STORAGE);}async function verifyKey(key){const res=await fetch("/.netlify/functions/verifyAdmin",{method:"POST",headers:(()=>{const h={"content-type":"application/json"};const t=localStorage.getItem("pretzel_admin_token")||"";if(t)h["x-admin-session"]=t;else h["x-admin-key"]=key;return h;})(),body:"{}"});const data=await res.json().catch(()=>({}));if(!res.ok)throw new Error(data.error || "Invalid key");return true;}function showGate(){$("loginGate").style.display="grid";$("adminApp").style.display="none";const lo=$("logoutBtn");if(lo)lo.style.display="none";}function showApp(){$("loginGate").style.display="none";$("adminApp").style.display="grid";const lo=$("logoutBtn");if(lo)lo.style.display="inline";}async function api(path,body){const key=getKey();const res=await fetch(path,{method:"POST",headers:(()=>{const h={"content-type":"application/json"};const t=localStorage.getItem("pretzel_admin_token")||"";if(t)h["x-admin-session"]=t;else h["x-admin-key"]=key;return h;})(),body:JSON.stringify(body ||{})});const data=await res.json().catch(()=>({}));if(!res.ok)throw new Error(data.error || "Request failed");return data;}let STATE=null;function populateTeams(state){const teams=(state.teams || []).slice().sort((a,b)=>String(a.name||"").localeCompare(String(b.name||"")));const teamSelects=["teamSelect","newPlayerTeam","moveTeam"];teamSelects.forEach(id=>{const sel=$(id);if(!sel)return;sel.innerHTML="";teams.forEach(t=>{const opt=document.createElement("option");opt.value=t.id;opt.textContent=t.name;sel.appendChild(opt);});});}function populatePlayers(state,query=""){const sel=$("playerSelect");if(!sel)return;sel.innerHTML="";const q=query.trim().toLowerCase();(state.players || []).slice().filter(p=>!q || String(p.name||"").toLowerCase().includes(q)).sort((a,b)=>String(a.name||"").localeCompare(String(b.name||""))).forEach(p=>{const opt=document.createElement("option");opt.value=p.id;opt.textContent=`${p.name}(${p.status || "alive"})• kills:${typeof p.kills==="number"?p.kills:0}`;sel.appendChild(opt);});}async function loadState(){const res=await fetch("/.netlify/functions/getState",{cache:"no-store"});const state=await res.json();STATE=state;const snap=$("snapshot");if(snap)snap.textContent=JSON.stringify(state,null,2);populateTeams(state);populatePlayers(state,$("playerSearch")?.value || "");setAdminStatus("State loaded.",true);return state;}async function seed(){msg("statusResult","Seeding demo data...");await api("/.netlify/functions/seedDemo",{});toast("Seeded demo data","ok");msg("statusResult","Seeded ✅",true);await loadState();}async function resetAll(){if(!confirm("Reset EVERYTHING? This clears teams,players,and log."))return;msg("statusResult","Resetting...");await api("/.netlify/functions/resetGame",{keepTeams:false});toast("Game reset","warn");await loadState();}async function addTeam(){const name=$("newTeamName").value.trim();if(!name)return msg("teamResult","Enter a team name first.");msg("teamResult","Creating team...");await api("/.netlify/functions/addTeam",{name});$("newTeamName").value="";toast(`Team created:${name}`,"ok");msg("teamResult","Team created ✅",true);await loadState();}async function renameTeam(){const teamId=$("teamSelect").value;const name=$("renameTeam").value.trim();if(!teamId)return msg("teamResult","Pick a team.");if(!name)return msg("teamResult","Enter the new team name.");msg("teamResult","Renaming...");await api("/.netlify/functions/renameTeam",{teamId,name});$("renameTeam").value="";toast("Team renamed","ok");msg("teamResult","Team renamed ✅",true);await loadState();}async function deleteTeam(){const teamId=$("teamSelect").value;if(!teamId)return msg("teamResult","Pick a team.");if(!confirm("Delete this team? Players will become unassigned."))return;msg("teamResult","Deleting team...");await api("/.netlify/functions/deleteTeam",{teamId});toast("Team deleted","warn");msg("teamResult","Team deleted ✅",true);await loadState();}async function addPlayer(){const name=$("newPlayerName").value.trim();const teamId=$("newPlayerTeam").value;if(!name)return msg("playerResult","Enter a player name.");msg("playerResult","Adding player...");await api("/.netlify/functions/addPlayer",{name,teamId});$("newPlayerName").value="";toast(`Player added:${name}`,"ok");msg("playerResult","Player added ✅",true);await loadState();}function parseNames(text){return text .split(/\r?\n|,/g).map(s=>s.trim()).filter(Boolean).slice(0,120);}async function bulkAddPlayers(){const raw=$("bulkPlayers").value || "";const teamId=$("bulkTeam").value;const names=parseNames(raw);if(!names.length)return toast("Paste some names first.","warn");let ok=0,fail=0;for(const n of names){try{await api("/.netlify/functions/addPlayer",{name:n,teamId});ok++;}catch(e){fail++;}}toast(`Bulk add done • ok:${ok}fail:${fail}`,fail ? "warn":"ok");$("bulkPlayers").value="";await loadState();}async function renamePlayer(){const playerId=$("playerSelect").value;const name=$("renamePlayer").value.trim();if(!playerId)return msg("playerResult","Pick a player.");if(!name)return msg("playerResult","Enter the new player name.");msg("playerResult","Renaming...");await api("/.netlify/functions/renamePlayer",{playerId,name});$("renamePlayer").value="";toast("Player renamed","ok");msg("playerResult","Player renamed ✅",true);await loadState();}async function movePlayer(){const playerId=$("playerSelect").value;const teamId=$("moveTeam").value;if(!playerId)return msg("playerResult","Pick a player.");if(!teamId)return msg("playerResult","Pick a team.");msg("playerResult","Moving player...");await api("/.netlify/functions/movePlayer",{playerId,teamId});toast("Player moved","ok");msg("playerResult","Player moved ✅",true);await loadState();}async function deletePlayer(){const playerId=$("playerSelect").value;if(!playerId)return msg("playerResult","Pick a player.");if(!confirm("Remove this player?"))return;msg("playerResult","Removing player...");await api("/.netlify/functions/deletePlayer",{playerId});toast("Player removed","warn");msg("playerResult","Player removed ✅",true);await loadState();}async function addKill(){const playerId=$("playerSelect").value;const logText=$("logMsg").value.trim()|| null;if(!playerId)return msg("statusResult","Pick a player first.");msg("statusResult","Adding kill...");await api("/.netlify/functions/updatePlayer",{playerId,addKill:true,logText});$("logMsg").value="";toast("+1 kill","ok");msg("statusResult","Kill added ✅",true);await loadState();}async function applyStatus(){const playerId=$("playerSelect").value;const status=$("statusSelect").value;const killsRaw=$("killsSet").value.trim();const killsSet=killsRaw==="" ? null:Number(killsRaw);const logText=$("logMsg").value.trim()|| null;if(!playerId)return msg("statusResult","Pick a player first.");if(killsSet !==null &&(!Number.isFinite(killsSet)|| killsSet<0))return msg("statusResult","Kills must be 0 or more.");msg("statusResult","Updating...");await api("/.netlify/functions/updatePlayer",{playerId,status,killsSet,logText});$("killsSet").value="";$("logMsg").value="";toast("Player updated","ok");msg("statusResult","Updated ✅",true);await loadState();}function injectPowerTools(){const controls=document.querySelector("#adminApp .panel.big>div");if(!controls)return;const searchWrap=document.createElement("div");searchWrap.className="panel";searchWrap.style.borderRadius="16px";searchWrap.innerHTML=`<div class="panel-head"><div class="panel-title">Power Tools</div><div class="panel-note">Fast search+bulk add</div></div><div style="padding:14px 16px;display:grid;gap:10px;"><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;"><div><div class="panel-note" style="margin-bottom:6px;">Search players</div><input id="playerSearch" placeholder="Type to filter dropdown…" style="width:100%;padding:12px;border-radius:14px;border:1px solid rgba(255,255,255,.10);background:rgba(0,0,0,.22);color:var(--text);outline:none;"></div><div style="display:flex;align-items:end;gap:10px;flex-wrap:wrap;"><button id="resetBtn" class="fbtn" style="padding:12px 14px;border-color:rgba(255,209,102,.35);background:rgba(255,209,102,.10);color:var(--text);">Reset Game</button></div></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;"><div><div class="panel-note" style="margin-bottom:6px;">Bulk add players(comma or new line)</div><textarea id="bulkPlayers" rows="4" placeholder="Ava\nBen\nCody\n…" style="width:100%;padding:12px;border-radius:14px;border:1px solid rgba(255,255,255,.10);background:rgba(0,0,0,.22);color:var(--text);outline:none;resize:vertical;"></textarea></div><div><div class="panel-note" style="margin-bottom:6px;">Bulk team</div><select id="bulkTeam" style="width:100%;padding:12px;border-radius:14px;border:1px solid rgba(255,255,255,.10);background:rgba(0,0,0,.22);color:var(--text);outline:none;"></select><div style="margin-top:10px;display:flex;gap:10px;flex-wrap:wrap;"><button id="bulkAddBtn" class="fbtn" style="padding:12px 14px;">Bulk Add</button></div><div class="panel-note" style="margin-top:8px;">Note:teams cap at 5 — overflow will fail and be counted.</div></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;"><div><div class="panel-note" style="margin-bottom:6px;">Push title</div><input id="pushTitle" placeholder="Pretzel HQ" style="width:100%;padding:12px;border-radius:14px;border:1px solid rgba(255,255,255,.10);background:rgba(0,0,0,.22);color:var(--text);outline:none;"></div><div><div class="panel-note" style="margin-bottom:6px;">Push message</div><input id="pushMsg" placeholder="Test ping from HQ…" style="width:100%;padding:12px;border-radius:14px;border:1px solid rgba(255,255,255,.10);background:rgba(0,0,0,.22);color:var(--text);outline:none;"></div></div><div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;"><button id="pushTestBtn" class="fbtn" style="padding:12px 14px;border-color:rgba(53,208,127,.35);background:rgba(53,208,127,.10);">Send Test Push</button><button id="genCodesBtn" class="fbtn" style="padding:12px 14px;border-color:rgba(255,209,102,.35);background:rgba(255,209,102,.10);">Generate Join Codes</button><div class="panel-note">Sends to subscribers(tag:all). Perfect for verifying phones.</div><div style="height:12px"></div><div class="panel" style="background:rgba(255,255,255,.04);"><div class="panel-head"><div class="panel-title">Broadcast to Team</div><div class="panel-note">tag-based</div></div><div style="padding:14px 16px;display:grid;gap:10px;"><select id="teamPick" style="width:100%;padding:12px;border-radius:14px;border:1px solid rgba(255,255,255,.10);background:rgba(0,0,0,.22);color:var(--text);outline:none;"></select><input id="teamTitle" placeholder="Sender / title" style="width:100%;padding:12px;border-radius:14px;border:1px solid rgba(255,255,255,.10);background:rgba(0,0,0,.22);color:var(--text);outline:none;"><input id="teamMsg" placeholder="Message" style="width:100%;padding:12px;border-radius:14px;border:1px solid rgba(255,255,255,.10);background:rgba(0,0,0,.22);color:var(--text);outline:none;"><button id="teamSend" class="fbtn" style="padding:12px 14px;">Send Team Push</button></div></div><div style="height:12px"></div><div class="panel" style="background:rgba(255,255,255,.04);"><div class="panel-head"><div class="panel-title">Announcement Push</div><div class="panel-note">to everyone</div></div><div style="padding:14px 16px;display:grid;gap:10px;"><input id="allTitle" placeholder="Sender / title" style="width:100%;padding:12px;border-radius:14px;border:1px solid rgba(255,255,255,.10);background:rgba(0,0,0,.22);color:var(--text);outline:none;"><input id="allMsg" placeholder="Message" style="width:100%;padding:12px;border-radius:14px;border:1px solid rgba(255,255,255,.10);background:rgba(0,0,0,.22);color:var(--text);outline:none;"><button id="allSend" class="fbtn" style="padding:12px 14px;">Send Announcement</button></div></div><div style="height:12px"></div><div class="panel" style="background:rgba(255,255,255,.04);"><div class="panel-head"><div class="panel-title">Direct Message Push</div><div class="panel-note">to one player</div></div><div style="padding:14px 16px;display:grid;gap:10px;"><select id="dmPlayer" style="width:100%;padding:12px;border-radius:14px;border:1px solid rgba(255,255,255,.10);background:rgba(0,0,0,.22);color:var(--text);outline:none;"></select><input id="dmTitle" placeholder="Sender / title(ex:Pretzel HQ)" style="width:100%;padding:12px;border-radius:14px;border:1px solid rgba(255,255,255,.10);background:rgba(0,0,0,.22);color:var(--text);outline:none;"><input id="dmMsg" placeholder="Message" style="width:100%;padding:12px;border-radius:14px;border:1px solid rgba(255,255,255,.10);background:rgba(0,0,0,.22);color:var(--text);outline:none;"><button id="dmSend" class="fbtn" style="padding:12px 14px;border-color:rgba(53,208,127,.35);background:rgba(53,208,127,.10);">Send DM Push</button><div class="panel-note">Player must enable notifications in the Player Portal to receive DMs.</div></div></div><div style="height:12px"></div><div class="panel" style="background:rgba(255,255,255,.04);"><div class="panel-head"><div class="panel-title">Review Queue</div><div class="panel-note">kill validations</div></div><div style="padding:14px 16px;display:flex;gap:10px;flex-wrap:wrap;align-items:center;"><button id="rvRefresh" class="fbtn">Refresh</button><div class="panel-note" id="rvCount">—</div></div><div style="padding:0 16px 16px;" id="rvQueue"></div></div></div></div>`;const firstRow=controls.firstElementChild;if(firstRow && !document.getElementById("playerSearch")){controls.insertBefore(searchWrap,firstRow.nextSibling);}}function syncBulkTeamOptions(){const a=$("newPlayerTeam");const b=$("bulkTeam");if(!a || !b)return;b.innerHTML=a.innerHTML;}function hookButtons(){$("load").addEventListener("click",()=>loadState().then(()=>toast("Loaded","ok")).catch(e=>{msg("statusResult",e.message);toast(e.message,"bad");}));$("seed").addEventListener("click",()=>seed().catch(e=>{msg("statusResult",e.message);toast(e.message,"bad");}));$("refreshBtn").addEventListener("click",()=>loadState().then(()=>toast("Refreshed","ok")).catch(e=>{msg("statusResult",e.message);toast(e.message,"bad");}));$("addTeamBtn").addEventListener("click",()=>addTeam().catch(e=>{msg("teamResult",e.message);toast(e.message,"bad");}));$("renameTeamBtn").addEventListener("click",()=>renameTeam().catch(e=>{msg("teamResult",e.message);toast(e.message,"bad");}));$("deleteTeamBtn").addEventListener("click",()=>deleteTeam().catch(e=>{msg("teamResult",e.message);toast(e.message,"bad");}));$("addPlayerBtn").addEventListener("click",()=>addPlayer().catch(e=>{msg("playerResult",e.message);toast(e.message,"bad");}));$("renamePlayerBtn").addEventListener("click",()=>renamePlayer().catch(e=>{msg("playerResult",e.message);toast(e.message,"bad");}));$("movePlayerBtn").addEventListener("click",()=>movePlayer().catch(e=>{msg("playerResult",e.message);toast(e.message,"bad");}));$("deletePlayerBtn").addEventListener("click",()=>deletePlayer().catch(e=>{msg("playerResult",e.message);toast(e.message,"bad");}));$("addKillBtn").addEventListener("click",()=>addKill().catch(e=>{msg("statusResult",e.message);toast(e.message,"bad");}));$("applyStatusBtn").addEventListener("click",()=>applyStatus().catch(e=>{msg("statusResult",e.message);toast(e.message,"bad");}));}async function doLogin(){const key=$("key").value.trim();if(!key)return setLoginStatus("Enter a key.",false);setLoginStatus("Checking…");try{await verifyKey(key);setKey(key);setLoginStatus("Unlocked ✅",true);showApp();setAdminStatus("Authenticated.",true);injectPowerTools();hookButtons();await loadState();syncBulkTeamOptions();$("resetBtn")?.addEventListener("click",()=>resetAll().catch(e=>toast(e.message,"bad")));$("bulkAddBtn")?.addEventListener("click",()=>bulkAddPlayers().catch(e=>toast(e.message,"bad")));$("playerSearch")?.addEventListener("input",()=>populatePlayers(STATE ||{players:[]},$("playerSearch").value));toast("Admin unlocked","ok");document.getElementById("genCodesBtn")?.addEventListener("click",async()=>{try{const data=await api("/.netlify/functions/adminGenerateJoinCodes",{});toast(`Join codes ready • created:${data.created}`,"ok");await refreshAll();await loadDMPlayers();async function loadTeams(){try{const st=await fetch("/.netlify/functions/getState",{cache:"no-store"}).then(r=>r.json());const sel=document.getElementById("teamPick");if(!sel)return;const ts=(st.teams||[]).slice().sort((a,b)=>String(a.name||"").localeCompare(String(b.name||"")));sel.innerHTML=ts.map(t=>`<option value="${t.id}">${t.name}</option>`).join("");}catch{}}await loadTeams();document.getElementById("teamSend")?.addEventListener("click",async()=>{try{const teamId=document.getElementById("teamPick")?.value || "";const title=document.getElementById("teamTitle")?.value || "Pretzel HQ";const message=document.getElementById("teamMsg")?.value || "";if(!teamId)return toast("Pick a team","warn");if(!message.trim())return toast("Write a message","warn");const data=await api("/.netlify/functions/adminPushTeam",{teamId,title,message});toast(`Team push sent • ok:${data.ok}fail:${data.fail}`,data.fail ? "warn":"ok");}catch(e){toast(e.message || "Failed","bad");}});document.getElementById("allSend")?.addEventListener("click",async()=>{try{const title=document.getElementById("allTitle")?.value || "Pretzel HQ";const message=document.getElementById("allMsg")?.value || "";if(!message.trim())return toast("Write a message","warn");const data=await api("/.netlify/functions/adminPushAll",{title,message});toast(`Announcement sent • ok:${data.ok}fail:${data.fail}`,data.fail ? "warn":"ok");}catch(e){toast(e.message || "Failed","bad");}});async function refreshStats(){try{const data=await api("/.netlify/functions/adminStats",{});const grid=document.getElementById("statsGrid");const stamp=document.getElementById("statsStamp");if(stamp)stamp.textContent=new Date().toLocaleString();if(!grid)return;const cards=[ ["Players",`${data.players.total}total • ${data.players.alive}alive • ${data.players.eliminated}out`],["Teams",`${data.teams.total}`],["Logins",`${data.logins.total}ever • ${data.logins.last24h}last 24h`],["Push Enabled",`${data.push.totalSubs}subscriptions`],["Reviews",`${data.reviews.pending}pending • avg ${data.reviews.avgTurnaround}`],["Top Tags",(data.push.byTagTop||[]).map(([k,v])=>`${k}:${v}`).join(" • ")|| "—"],];grid.innerHTML=`<div class="grid" style="grid-template-columns:1fr 1fr;gap:12px;">`+cards.map(([t,v])=>`<div class="panel" style="background:rgba(255,255,255,.04);"><div class="panel-head"><div class="panel-title">${t}</div></div><div style="padding:14px 16px;"><div class="panel-note" style="font-size:14px;">${String(v).replace(/</g,"&lt;")}</div></div></div>`).join("")+`</div>`;}catch(e){}}document.getElementById("statsRefresh")?.addEventListener("click",refreshStats);await refreshStats();}catch(e){toast(e.message || "Failed","bad");}});async function loadDMPlayers(){try{const st=await fetch("/.netlify/functions/getState",{cache:"no-store"}).then(r=>r.json());const sel=document.getElementById("dmPlayer");if(!sel)return;const ps=(st.players||[]).slice().sort((a,b)=>String(a.name||"").localeCompare(String(b.name||"")));sel.innerHTML=ps.map(p=>`<option value="${p.id}">${p.name}${p.joinCode?` • ${p.joinCode}`:""}</option>`).join("");}catch{}}await loadDMPlayers();async function loadTeams(){try{const st=await fetch("/.netlify/functions/getState",{cache:"no-store"}).then(r=>r.json());const sel=document.getElementById("teamPick");if(!sel)return;const ts=(st.teams||[]).slice().sort((a,b)=>String(a.name||"").localeCompare(String(b.name||"")));sel.innerHTML=ts.map(t=>`<option value="${t.id}">${t.name}</option>`).join("");}catch{}}await loadTeams();document.getElementById("teamSend")?.addEventListener("click",async()=>{try{const teamId=document.getElementById("teamPick")?.value || "";const title=document.getElementById("teamTitle")?.value || "Pretzel HQ";const message=document.getElementById("teamMsg")?.value || "";if(!teamId)return toast("Pick a team","warn");if(!message.trim())return toast("Write a message","warn");const data=await api("/.netlify/functions/adminPushTeam",{teamId,title,message});toast(`Team push sent • ok:${data.ok}fail:${data.fail}`,data.fail ? "warn":"ok");}catch(e){toast(e.message || "Failed","bad");}});document.getElementById("allSend")?.addEventListener("click",async()=>{try{const title=document.getElementById("allTitle")?.value || "Pretzel HQ";const message=document.getElementById("allMsg")?.value || "";if(!message.trim())return toast("Write a message","warn");const data=await api("/.netlify/functions/adminPushAll",{title,message});toast(`Announcement sent • ok:${data.ok}fail:${data.fail}`,data.fail ? "warn":"ok");}catch(e){toast(e.message || "Failed","bad");}});async function refreshStats(){try{const data=await api("/.netlify/functions/adminStats",{});const grid=document.getElementById("statsGrid");const stamp=document.getElementById("statsStamp");if(stamp)stamp.textContent=new Date().toLocaleString();if(!grid)return;const cards=[ ["Players",`${data.players.total}total • ${data.players.alive}alive • ${data.players.eliminated}out`],["Teams",`${data.teams.total}`],["Logins",`${data.logins.total}ever • ${data.logins.last24h}last 24h`],["Push Enabled",`${data.push.totalSubs}subscriptions`],["Reviews",`${data.reviews.pending}pending • avg ${data.reviews.avgTurnaround}`],["Top Tags",(data.push.byTagTop||[]).map(([k,v])=>`${k}:${v}`).join(" • ")|| "—"],];grid.innerHTML=`<div class="grid" style="grid-template-columns:1fr 1fr;gap:12px;">`+cards.map(([t,v])=>`<div class="panel" style="background:rgba(255,255,255,.04);"><div class="panel-head"><div class="panel-title">${t}</div></div><div style="padding:14px 16px;"><div class="panel-note" style="font-size:14px;">${String(v).replace(/</g,"&lt;")}</div></div></div>`).join("")+`</div>`;}catch(e){}}document.getElementById("statsRefresh")?.addEventListener("click",refreshStats);await refreshStats();document.getElementById("dmSend")?.addEventListener("click",async()=>{try{const pid=document.getElementById("dmPlayer")?.value || "";const title=document.getElementById("dmTitle")?.value || "Pretzel HQ";const message=document.getElementById("dmMsg")?.value || "";if(!pid)return toast("Pick a player","warn");if(!message.trim())return toast("Write a message","warn");const data=await api("/.netlify/functions/adminPushPlayer",{playerId:pid,title,message});toast(`DM sent • ok:${data.ok}fail:${data.fail}`,data.fail ? "warn":"ok");}catch(e){toast(e.message || "DM failed","bad");}});async function refreshReviewQueue(){try{const data=await api("/.netlify/functions/adminListReviews",{});const items=data.items || [];const pending=items.filter(x=>String(x.status||"").toLowerCase()==="pending");const box=document.getElementById("rvQueue");const cnt=document.getElementById("rvCount");if(cnt)cnt.textContent=`${pending.length}pending • ${items.length}total`;if(!box)return;if(!pending.length){box.innerHTML=`<div class="panel-note">No pending reviews.</div>`;return;}box.innerHTML=pending.map(it=>`<div style="padding:12px 0;border-bottom:1px solid rgba(255,255,255,.08);"><div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;"><div><div style="font-weight:900;">${it.playerName || "Player"}• ${it.title || "Request"}</div><div class="panel-note">${String(it.ts||"").slice(0,16).replace("T"," ")}</div></div><div style="display:flex;gap:8px;flex-wrap:wrap;"><button class="fbtn" data-act="approve" data-id="${it.id}" style="border-color:rgba(53,208,127,.35);background:rgba(53,208,127,.10);">Approve</button><button class="fbtn" data-act="deny" data-id="${it.id}" style="border-color:rgba(255,107,107,.35);background:rgba(255,107,107,.10);">Deny</button></div></div><div class="panel-note" style="margin-top:8px;white-space:pre-wrap;">${String(it.details||"").replace(/</g,"&lt;").replace(/>/g,"&gt;")}</div>${it.link ? `<div style="margin-top:8px;"><a class="linklike" href="${it.link}" target="_blank" rel="noopener">Open video link</a></div>`:``}<div style="margin-top:10px;display:flex;gap:10px;flex-wrap:wrap;"><input data-note="${it.id}" placeholder="Admin note(optional)" style="flex:1;min-width:220px;padding:10px;border-radius:12px;border:1px solid rgba(255,255,255,.10);background:rgba(0,0,0,.22);color:var(--text);outline:none;"></div></div>`).join("");box.querySelectorAll("button[data-act]")?.forEach(btn=>{btn.addEventListener("click",async()=>{const id=btn.getAttribute("data-id");const act=btn.getAttribute("data-act");const note=box.querySelector(`input[data-note="${id}"]`)?.value || "";try{await api("/.netlify/functions/adminDecideReview",{id,status:act==="approve"?"approved":"denied",adminNote:note});toast(`Review ${act}d`,"ok");await refreshReviewQueue();}catch(e){toast(e.message || "Failed","bad");}});});}catch(e){}}document.getElementById("rvRefresh")?.addEventListener("click",refreshReviewQueue);await refreshReviewQueue();document.getElementById("pushTestBtn")?.addEventListener("click",async()=>{try{const title=document.getElementById("pushTitle")?.value || "Pretzel HQ";const message=document.getElementById("pushMsg")?.value || "Test notification";const data=await api("/.netlify/functions/pushTest",{title,message,tags:["all"]});toast(`Push sent • ok:${data.ok}fail:${data.fail}`,data.fail ? "warn":"ok");}catch(e){toast(e.message || "Push failed","bad");}});}catch(e){setLoginStatus(e.message || "Invalid key",false);toast(e.message || "Invalid key","bad");showGate();}}function doLogout(){clearKey();$("key").value="";setLoginStatus("Locked",false);showGate();toast("Logged out","info");}async function init(){$("loginBtn").addEventListener("click",()=>doLogin());$("clearBtn").addEventListener("click",()=>{$("key").value="";setLoginStatus("Cleared",true);});$("key").addEventListener("keydown",(e)=>{if(e.key==="Enter")doLogin();});const logoutBtn=$("logoutBtn");if(logoutBtn){logoutBtn.addEventListener("click",(e)=>{e.preventDefault();doLogout();});}const existing=getKey();if(existing){$("key").value=existing;setLoginStatus("Checking saved key…");try{await verifyKey(existing);showApp();setAdminStatus("Authenticated.",true);injectPowerTools();hookButtons();await loadState();syncBulkTeamOptions();$("resetBtn")?.addEventListener("click",()=>resetAll().catch(e=>toast(e.message,"bad")));$("bulkAddBtn")?.addEventListener("click",()=>bulkAddPlayers().catch(e=>toast(e.message,"bad")));$("playerSearch")?.addEventListener("input",()=>populatePlayers(STATE ||{players:[]},$("playerSearch").value));setLoginStatus("Unlocked ✅",true);toast("Admin unlocked","ok");document.getElementById("pushTestBtn")?.addEventListener("click",async()=>{try{const title=document.getElementById("pushTitle")?.value || "Pretzel HQ";const message=document.getElementById("pushMsg")?.value || "Test notification";const data=await api("/.netlify/functions/pushTest",{title,message,tags:["all"]});toast(`Push sent • ok:${data.ok}fail:${data.fail}`,data.fail ? "warn":"ok");}catch(e){toast(e.message || "Push failed","bad");}});}catch{doLogout();}}else{showGate();}}init();;(()=>{const box=document.getElementById("adminLogin");const main=document.querySelector("main");function setMsg(t){const el=document.getElementById("alog");if(el)el.textContent=t||"";}async function doLogin(){try{const u=(document.getElementById("au")?.value||"").trim();const p=(document.getElementById("ap")?.value||"");if(!u||!p)return setMsg("Enter login");setMsg("...");const r=await fetch("/.netlify/functions/adminLogin",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({username:u,password:p})});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||"Login failed");localStorage.setItem("pretzel_admin_token",d.token);setMsg("Logged in ✅");location.reload();}catch(e){setMsg(e.message||"Login failed");}}document.getElementById("al")?.addEventListener("click",doLogin);if(__t){if(box)box.style.display="none";}else{if(main)main.style.display="none";}})();async function refreshMessageHistory(){try{const d=await api("/.netlify/functions/adminMessageHistory",{});const b=document.getElementById("mhList");if(!b)return;const it=d.items||[];if(!it.length){b.innerHTML=`<div class="panel-note">No history yet.</div>`;return;}b.innerHTML=it.slice(0,140).map(x=>{const t=String(x.ts||"").slice(0,16).replace("T"," ");const tgt=x.target==="player"?"PLAYER":x.target==="team"?"TEAM":"ALL";const who=x.playerId?` • ${x.playerId}`:x.teamId?` • ${x.teamId}`:"";return `<div style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,.08);"><div style="display:flex;justify-content:space-between;gap:10px;"><div style="font-weight:900;">${String(x.title||"Pretzel HQ").replace(/</g,"&lt;")}</div><div class="panel-note">${t}</div></div><div class="panel-note" style="white-space:pre-wrap;margin-top:6px;">${String(x.message||"").replace(/</g,"&lt;")}</div><div class="panel-note" style="margin-top:8px;opacity:.75;">${tgt}${who}</div></div>`;}).join("");}catch(e){}}document.getElementById("mhRefresh")?.addEventListener("click",refreshMessageHistory);try{await refreshMessageHistory();}catch(e){}

// ===== Deluxe Admin Console wiring (v16) =====
(function(){
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
  const $1 = (sel, root=document) => root.querySelector(sel);
  const toastEl = document.getElementById("toast");
  const toast = (msg) => {
    if(!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastEl._t);
    toastEl._t=setTimeout(()=>toastEl.classList.remove("show"), 2400);
  };

  function setupTabs(){
    const btns = $$(".side-btn[data-tab]");
    const panels = $$("[data-tabpanel]");
    const show = (name) => {
      btns.forEach(b=>b.classList.toggle("is-active", b.dataset.tab===name));
      panels.forEach(p=>p.classList.toggle("hidden", p.dataset.tabpanel!==name));
      try{ localStorage.setItem("pretzel_admin_tab", name); }catch(e){}
    };
    btns.forEach(b=>b.addEventListener("click", ()=>show(b.dataset.tab)));
    const saved = (()=>{try{return localStorage.getItem("pretzel_admin_tab")}catch(e){return null}})();
    show(saved || "overview");
  }

  async function ensureState(){
    if(window.STATE && window.STATE.players && window.STATE.teams) return window.STATE;
    const loadBtn = document.getElementById("load");
    if(loadBtn) loadBtn.click();
    // wait a tick for existing loader
    for(let i=0;i<20;i++){
      await new Promise(r=>setTimeout(r,150));
      if(window.STATE && window.STATE.players && window.STATE.teams) return window.STATE;
    }
    return window.STATE || null;
  }

  function rosterTargetsFromState(st){
    const teams = (st?.teams || []).map(t=>({id:t.id, name:t.name}));
    const players = (st?.players || []).map(p=>({id:p.id, name:p.name, teamId:p.teamId}));
    return {teams, players};
  }

  function fillTargetSelect(select, items, placeholder="—"){
    if(!select) return;
    select.innerHTML = `<option value="">${placeholder}</option>` + items.map(it=>`<option value="${it.id}">${it.name}</option>`).join("");
  }

  async function wireOverviewBroadcast(){
    const modeSel = document.getElementById("pushMode");
    const targetSel = document.getElementById("pushTarget");
    const sendBtn = document.getElementById("pushSendBtn");
    const titleEl = document.getElementById("pushTitle");
    const bodyEl = document.getElementById("pushBody");
    const resultEl = document.getElementById("pushResult");

    const syncTargets = async () => {
      const st = await ensureState();
      const {teams, players} = rosterTargetsFromState(st);
      const mode = modeSel?.value || "all";
      if(mode==="team") fillTargetSelect(targetSel, teams, "Pick a team…");
      else if(mode==="player") fillTargetSelect(targetSel, players, "Pick a player…");
      else fillTargetSelect(targetSel, [], "—");
      if(mode==="all") targetSel?.setAttribute("disabled","disabled"); else targetSel?.removeAttribute("disabled");
    };

    modeSel?.addEventListener("change", syncTargets);
    await syncTargets();

    sendBtn?.addEventListener("click", async ()=>{
      try{
        const mode = modeSel.value;
        const target = targetSel.value;
        const title = (titleEl.value||"").trim();
        const body = (bodyEl.value||"").trim();
        if(!body) throw new Error("Write a message first.");
        resultEl.textContent="Sending…";
        if(mode==="all"){
          await api("/.netlify/functions/adminPushAll", { title, body });
        }else if(mode==="team"){
          if(!target) throw new Error("Pick a team.");
          await api("/.netlify/functions/adminPushTeam", { teamId: target, title, body });
        }else{
          if(!target) throw new Error("Pick a player.");
          await api("/.netlify/functions/adminPushPlayer", { playerId: target, title, body });
        }
        resultEl.textContent="Sent ✅";
        toast("Push sent");
      }catch(err){
        resultEl.textContent = "Error: " + (err?.message || err);
      }
    });
  }

  async function wireBroadcastTab(){
    const modeSel = document.getElementById("bcMode");
    const targetSel = document.getElementById("bcTarget");
    const titleEl = document.getElementById("bcTitle");
    const bodyEl = document.getElementById("bcBody");
    const sendBtn = document.getElementById("bcSend");
    const resEl = document.getElementById("bcResult");

    const templates = {
      start: { title:"Game starts soon", body:"Reminder: the game starts at the posted time. Make sure your team is set and notifications are on." },
      rules: { title:"Quick rules reminder", body:"Friendly reminder: safe zones still count, goggles = immunity item, and attempts must be clear on video for review." },
      review: { title:"Review update", body:"A review needs attention. If we asked for clarification, reply with details + your video." },
      update: { title:"Update", body:"Heads up — check Pretzel HQ for the latest status + leaderboard." },
    };

    $$(".template[data-tpl]").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const t = templates[btn.dataset.tpl];
        if(!t) return;
        titleEl.value = t.title;
        bodyEl.value = t.body;
        toast("Template loaded");
      });
    });

    const syncTargets = async () => {
      const st = await ensureState();
      const {teams, players} = rosterTargetsFromState(st);
      const mode = modeSel?.value || "all";
      if(mode==="team") fillTargetSelect(targetSel, teams, "Pick a team…");
      else if(mode==="player") fillTargetSelect(targetSel, players, "Pick a player…");
      else fillTargetSelect(targetSel, [], "—");
      if(mode==="all") targetSel?.setAttribute("disabled","disabled"); else targetSel?.removeAttribute("disabled");
    };

    modeSel?.addEventListener("change", syncTargets);
    await syncTargets();

    sendBtn?.addEventListener("click", async ()=>{
      try{
        const mode = modeSel.value;
        const target = targetSel.value;
        const title = (titleEl.value||"").trim();
        const body = (bodyEl.value||"").trim();
        if(!body) throw new Error("Write a message first.");
        resEl.textContent="Sending…";
        if(mode==="all"){
          await api("/.netlify/functions/adminPushAll", { title, body });
        }else if(mode==="team"){
          if(!target) throw new Error("Pick a team.");
          await api("/.netlify/functions/adminPushTeam", { teamId: target, title, body });
        }else{
          if(!target) throw new Error("Pick a player.");
          await api("/.netlify/functions/adminPushPlayer", { playerId: target, title, body });
        }
        resEl.textContent="Sent ✅";
        toast("Broadcast sent");
      }catch(err){
        resEl.textContent = "Error: " + (err?.message || err);
      }
    });
  }

  function fmtMs(ms){
    if(!isFinite(ms) || ms<0) return "—";
    const s=Math.floor(ms/1000);
    const m=Math.floor(s/60);
    const h=Math.floor(m/60);
    const d=Math.floor(h/24);
    if(d>0) return `${d}d ${h%24}h`;
    if(h>0) return `${h}h ${m%60}m`;
    if(m>0) return `${m}m`;
    return `${s}s`;
  }

  async function wireReviews(){
    const refresh = document.getElementById("reviewsRefresh");
    const list = document.getElementById("reviewsList");
    const mini = document.getElementById("reviewMiniList");
    const focus = document.getElementById("reviewFocus");
    const note = document.getElementById("reviewNote");
    const approve = document.getElementById("reviewApprove");
    const deny = document.getElementById("reviewDeny");
    const res = document.getElementById("reviewResult");

    let selectedId = null;
    let selected = null;

    async function load(){
      try{
        const data = await api("/.netlify/functions/adminListReviews");
        const items = (data?.reviews || []).slice().sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
        const render = (targetEl, compact=false) => {
          if(!targetEl) return;
          if(items.length===0){ targetEl.innerHTML = `<div class="muted small">No pending reviews 🎉</div>`; return; }
          targetEl.innerHTML = items.map(r=>{
            const age = Date.now() - (r.createdAt||Date.now());
            const who = r.requesterName || r.requesterId || "Player";
            const vs = r.targetName ? ` → ${r.targetName}` : "";
            const badge = r.status || "pending";
            return `
              <div class="item" data-rid="${r.id}" style="cursor:pointer">
                <div class="item-title">${who}${vs} <span class="muted">(${badge})</span></div>
                <div class="item-sub">${new Date(r.createdAt||Date.now()).toLocaleString()} • age ${fmtMs(age)} • ${r.summary||"review request"}</div>
              </div>
            `;
          }).join("");
          $$(".item[data-rid]", targetEl).forEach(el=>{
            el.addEventListener("click", ()=>select(el.getAttribute("data-rid")));
          });
        };
        render(list);
        render(mini, true);

        // KPIs
        const kpi = document.getElementById("kpiReviews");
        const kpiSub = document.getElementById("kpiReviewsSub");
        if(kpi) kpi.textContent = String(items.filter(x=>(x.status||"pending")==="pending").length);
        if(kpiSub) kpiSub.textContent = "pending right now";
      }catch(err){
        if(list) list.innerHTML = `<div class="muted small">Error loading reviews.</div>`;
      }
    }

    async function select(id){
      selectedId = id;
      try{
        const data = await api("/.netlify/functions/adminListReviews");
        selected = (data?.reviews || []).find(r=>r.id===id) || null;
      }catch(e){ selected=null; }
      if(!selected){
        focus.textContent="Review not found.";
        approve.disabled=true; deny.disabled=true;
        return;
      }
      approve.disabled=false; deny.disabled=false;
      const age = Date.now() - (selected.createdAt||Date.now());
      focus.innerHTML = `
        <div class="item">
          <div class="item-title">${selected.requesterName || selected.requesterId || "Player"}${selected.targetName ? ` → ${selected.targetName}`:""}</div>
          <div class="item-sub">Submitted: ${new Date(selected.createdAt||Date.now()).toLocaleString()} • age ${fmtMs(age)}</div>
          <div class="item-sub" style="margin-top:6px">${selected.details || selected.summary || "—"}</div>
          ${selected.videoUrl ? `<div class="item-sub" style="margin-top:6px">Video: <a class="link" href="${selected.videoUrl}" target="_blank" rel="noreferrer">open</a></div>`:""}
        </div>
      `;
      res.textContent="";
    }

    async function decide(decision){
      try{
        if(!selectedId) throw new Error("Pick a review first.");
        res.textContent="Saving…";
        await api("/.netlify/functions/adminDecideReview", { id: selectedId, decision, note: (note.value||"").trim() });
        res.textContent = (decision==="approve"?"Approved ✅":"Denied ❌");
        toast("Review updated");
        selectedId=null; selected=null; note.value="";
        approve.disabled=true; deny.disabled=true;
        focus.textContent="Pick a review from the list.";
        await load();
      }catch(err){
        res.textContent = "Error: " + (err?.message || err);
      }
    }

    refresh?.addEventListener("click", load);
    document.getElementById("refreshReviewsBtn")?.addEventListener("click", load);
    approve?.addEventListener("click", ()=>decide("approve"));
    deny?.addEventListener("click", ()=>decide("deny"));

    await load();
  }

  async function wireStats(){
    const refresh = document.getElementById("statsRefresh");
    const chart = document.getElementById("chart1");
    async function load(){
      try{
        const stats = await api("/.netlify/functions/adminStats");
        // KPIs (from endpoint)
        const set = (id, v) => { const el=document.getElementById(id); if(el) el.textContent = v; };
        set("kpiPlayers", String(stats.totalPlayers ?? "—"));
        set("kpiTeams", String(stats.totalTeams ?? "—"));
        set("kpiPush", String(stats.pushEnabled ?? "—"));
        set("kpiPlayersSub", (stats.totalAlive!=null?`${stats.totalAlive} alive • ${stats.totalEliminated} out`:"—"));
        set("kpiTeamsSub", (stats.avgTeamSize!=null?`avg size ${stats.avgTeamSize.toFixed(1)}`:"—"));
        set("kpiPushSub", (stats.pushEnabled!=null?`~${stats.pushEnabledPct}% enabled`:"—"));

        set("statLogins", String(stats.playerLogins ?? "—"));
        set("statLoginsSub", stats.playerLogins!=null ? "unique logins" : "—");
        set("statPush", String(stats.pushEnabled ?? "—"));
        set("statPushSub", stats.pushEnabled!=null ? `${stats.pushEnabledPct}% of players` : "—");
        set("statReviewAvg", stats.avgReviewMs!=null ? fmtMs(stats.avgReviewMs) : "—");
        set("statReviewAvgSub", stats.avgReviewMs!=null ? "average turnaround" : "—");
        set("statReviewsToday", String(stats.reviewsToday ?? "—"));
        set("statReviewsTodaySub", stats.reviewsToday!=null ? "decisions today" : "—");

        // Simple chart (7d)
        if(chart && chart.getContext){
          const ctx = chart.getContext("2d");
          const w = chart.width = chart.clientWidth * (window.devicePixelRatio||1);
          const h = chart.height = 160 * (window.devicePixelRatio||1);
          ctx.clearRect(0,0,w,h);
          const days = stats.last7Days || [];
          const pushes = stats.last7Pushes || [];
          const maxV = Math.max(1, ...days.map(d=>d.decisions||0), ...pushes.map(d=>d.count||0));
          const pad=18*(window.devicePixelRatio||1);
          const x0=pad, y0=h-pad, x1=w-pad, y1=pad;
          const n = Math.max(days.length, pushes.length, 7);
          const step = (x1-x0)/(n-1||1);

          // axes
          ctx.globalAlpha=0.25;
          ctx.strokeStyle="#ffffff";
          ctx.lineWidth=1*(window.devicePixelRatio||1);
          ctx.beginPath(); ctx.moveTo(x0,y0); ctx.lineTo(x1,y0); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(x0,y0); ctx.lineTo(x0,y1); ctx.stroke();
          ctx.globalAlpha=1;

          function y(v){ return y0 - (v/maxV)*(y0-y1); }
          function plot(series, color){
            ctx.strokeStyle=color;
            ctx.lineWidth=2*(window.devicePixelRatio||1);
            ctx.beginPath();
            series.forEach((d,i)=>{
              const xv = x0 + i*step;
              const yv = y(d.v);
              if(i===0) ctx.moveTo(xv,yv); else ctx.lineTo(xv,yv);
            });
            ctx.stroke();
            // dots
            ctx.fillStyle=color;
            series.forEach((d,i)=>{
              const xv = x0 + i*step;
              const yv = y(d.v);
              ctx.beginPath(); ctx.arc(xv,yv,3*(window.devicePixelRatio||1),0,Math.PI*2); ctx.fill();
            });
          }

          const s1 = Array.from({length:n}, (_,i)=>({v: (days[i]?.decisions)||0}));
          const s2 = Array.from({length:n}, (_,i)=>({v: (pushes[i]?.count)||0}));
          plot(s1, "rgba(44,125,255,.95)");
          plot(s2, "rgba(255,122,24,.95)");

          // legend
          ctx.font = `${12*(window.devicePixelRatio||1)}px system-ui`;
          ctx.fillStyle="rgba(255,255,255,.75)";
          ctx.fillText("Decisions", x0, y1+12*(window.devicePixelRatio||1));
          ctx.fillStyle="rgba(44,125,255,.95)";
          ctx.fillRect(x0-12*(window.devicePixelRatio||1), y1+4*(window.devicePixelRatio||1), 8*(window.devicePixelRatio||1), 8*(window.devicePixelRatio||1));
          ctx.fillStyle="rgba(255,255,255,.75)";
          ctx.fillText("Pushes", x0+90*(window.devicePixelRatio||1), y1+12*(window.devicePixelRatio||1));
          ctx.fillStyle="rgba(255,122,24,.95)";
          ctx.fillRect(x0+78*(window.devicePixelRatio||1), y1+4*(window.devicePixelRatio||1), 8*(window.devicePixelRatio||1), 8*(window.devicePixelRatio||1));
        }
      }catch(err){
        // ignore
      }
    }
    refresh?.addEventListener("click", load);
    await load();
  }

  async function wireSettings(){
    const genBtn = document.getElementById("genCodesBtn");
    const countEl = document.getElementById("codeCount");
    const out = document.getElementById("codesOut");
    genBtn?.addEventListener("click", async ()=>{
      try{
        const n = Math.max(1, Math.min(500, parseInt(countEl.value||"50",10)||50));
        out.textContent="Generating…";
        const data = await api("/.netlify/functions/adminGenerateJoinCodes", { count: n });
        out.textContent = (data.codes||[]).join("\n");
        toast("Codes generated");
      }catch(err){
        out.textContent="Error: "+(err?.message||err);
      }
    });

    const exportBtn = document.getElementById("exportBtn");
    const importFile = document.getElementById("importFile");
    const msg = document.getElementById("backupMsg");

    exportBtn?.addEventListener("click", async ()=>{
      try{
        msg.textContent="Exporting…";
        const data = await api("/.netlify/functions/getState");
        const blob = new Blob([JSON.stringify(data, null, 2)], {type:"application/json"});
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `pretzelhq-backup-${new Date().toISOString().slice(0,10)}.json`;
        document.body.appendChild(a); a.click(); a.remove();
        msg.textContent="Exported ✅";
      }catch(err){
        msg.textContent="Error: "+(err?.message||err);
      }
    });

    importFile?.addEventListener("change", async ()=>{
      const f = importFile.files?.[0];
      if(!f) return;
      try{
        msg.textContent="Importing…";
        const txt = await f.text();
        const parsed = JSON.parse(txt);
        await api("/.netlify/functions/setState", { state: parsed });
        msg.textContent="Imported ✅ (refreshing…)";
        toast("State imported");
        setTimeout(()=>location.reload(), 700);
      }catch(err){
        msg.textContent="Error: "+(err?.message||err);
      }finally{
        importFile.value="";
      }
    });
  }

  async function bootDeluxe(){
    if(!document.querySelector(".sidebar")) return;
    setupTabs();
    await wireOverviewBroadcast();
    await wireBroadcastTab();
    await wireReviews();
    await wireStats();
    await wireSettings();
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", bootDeluxe);
  else bootDeluxe();
})();
