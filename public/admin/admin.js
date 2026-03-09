(() => {
  const $ = (id) => document.getElementById(id);

  const TOKEN_KEY = 'pretzel_admin_token';

  const toastHost = $('toast');
  function toast(msg, kind='info'){
    if (!toastHost) return;
    const el = document.createElement('div');
    el.className = 'toast';
    el.style.padding = '10px 12px';
    el.style.borderRadius = '14px';
    el.style.border = '1px solid rgba(255,255,255,.12)';
    el.style.background = kind==='err' ? 'rgba(255,77,109,.15)' : 'rgba(0,0,0,.35)';
    el.style.backdropFilter = 'blur(10px)';
    el.style.color = 'var(--text)';
    el.textContent = msg;
    toastHost.appendChild(el);
    setTimeout(() => el.remove(), 4200);
  }

    function esc(s){
    return String(s||'').replace(/[&<>"']/g, (c)=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  }

function getToken(){
    return localStorage.getItem(TOKEN_KEY) || '';
  }
  function setToken(t){
    if (t) localStorage.setItem(TOKEN_KEY, t);
    else localStorage.removeItem(TOKEN_KEY);
  }

  async function api(fn, body){
    const token = getToken();
    const res = await fetch(`/.netlify/functions/${fn}`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}`, 'x-admin-token': token } : {})
      },
      body: JSON.stringify(body || {})
    });
    const text = await res.text();
    let data = null;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }
    if (!res.ok) {
      const msg = (data && (data.error || data.message)) || `Request failed (${res.status})`;
      throw new Error(msg);
    }
    return data;
  }

  function showAuthed(){
    $('adminLogin').style.display = 'none';
    $('adminApp').style.display = '';
    const lo = $('logoutBtn');
    if (lo) lo.style.display = '';
  }
  function showLogin(){
    $('adminLogin').style.display = '';
    $('adminApp').style.display = 'none';
    const lo = $('logoutBtn');
    if (lo) lo.style.display = 'none';
  }

  async function attemptVerify(){
    try {
      await api('verifyAdmin', {});
      return true;
    } catch {
      return false;
    }
  }

  // ---- State helpers ----
  let stateCache = null;

  function fillSelect(sel, items, placeholder){
    sel.innerHTML = '';
    const opt0 = document.createElement('option');
    opt0.value = '';
    opt0.textContent = placeholder || '—';
    sel.appendChild(opt0);
    for (const it of items){
      const opt = document.createElement('option');
      opt.value = it.id;
      opt.textContent = it.name;
      sel.appendChild(opt);
    }
  }

  function renderSnapshot(state){
    const snap = $('snapshot');
    if (!snap) return;

    // Pretty snapshot (kept scrollable in the UI)
    const snapshotText = JSON.stringify(state, null, 2);
    snap.textContent = snapshotText;

    // Copy / download helpers (bind once)
    const copyBtn = $('copySnapshot');
    if (copyBtn && !copyBtn.__bound){
      copyBtn.__bound = true;
      copyBtn.addEventListener('click', async () => {
        try{
          await navigator.clipboard.writeText($('snapshot')?.textContent || '');
          toast('Copied');
        }catch(e){
          toast('Copy failed');
        }
      });
    }
    const dlBtn = $('downloadSnapshot');
    if (dlBtn && !dlBtn.__bound){
      dlBtn.__bound = true;
      dlBtn.addEventListener('click', () => {
        try{
          const blob = new Blob([$('snapshot')?.textContent || ''], {type:'application/json'});
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = 'pretzelhq-snapshot.json';
          document.body.appendChild(a);
          a.click();
          a.remove();
          setTimeout(()=>URL.revokeObjectURL(a.href), 1500);
        }catch(e){
          toast('Download failed');
        }
      });
    }

    // Log viewer (paged + searchable)
    const list = $('logList');
    const filterEl = $('logFilter');
    const prev = $('logPrev');
    const next = $('logNext');
    const meta = $('logMeta');
    const pageInfo = $('logPageInfo');

    if (!list) return;

    const pageSize = 25;
    const raw = Array.isArray(state?.log) ? state.log : [];
    // Newest first
    const logs = raw.slice().reverse().map((x) => {
      if (typeof x === 'string') return { t: '', msg: x };
      if (!x || typeof x !== 'object') return { t:'', msg:String(x) };
      const t = x.t || x.time || x.ts || '';
      const msg = x.msg || x.message || x.text || JSON.stringify(x);
      return { t:String(t||''), msg:String(msg||'') };
    });

    // store page on window so it survives refresh() calls
    const w = window;
    if (typeof w.__pretzelLogPage !== 'number') w.__pretzelLogPage = 0;

    const render = () => {
      const q = (filterEl?.value || '').trim().toLowerCase();
      const filtered = q ? logs.filter(it => (it.t+' '+it.msg).toLowerCase().includes(q)) : logs;

      const total = filtered.length;
      const maxPage = Math.max(0, Math.ceil(total / pageSize) - 1);
      w.__pretzelLogPage = Math.min(w.__pretzelLogPage, maxPage);

      const start = w.__pretzelLogPage * pageSize;
      const slice = filtered.slice(start, start + pageSize);

      list.innerHTML = slice.map(it => {
        const time = it.t ? `<div class="muted" style="font-size:12px;">${esc(it.t)}</div>` : '';
        return `<div class="panel" style="border-radius:12px;">
                  <div style="padding:10px 12px;">
                    ${time}
                    <div style="white-space:pre-wrap; word-break:break-word;">${esc(it.msg)}</div>
                  </div>
                </div>`;
      }).join('') || `<div class="muted">No log entries.</div>`;

      if (meta) meta.textContent = q ? `${filtered.length} matched • ${raw.length} total` : `${raw.length} total`;
      if (pageInfo) pageInfo.textContent = total ? `Page ${w.__pretzelLogPage+1} / ${maxPage+1}` : '—';

      if (prev) prev.disabled = (w.__pretzelLogPage <= 0);
      if (next) next.disabled = (w.__pretzelLogPage >= maxPage);
    };

    if (filterEl && !filterEl.__bound){
      filterEl.__bound = true;
      filterEl.addEventListener('input', () => { window.__pretzelLogPage = 0; render(); });
    }
    if (prev && !prev.__bound){
      prev.__bound = true;
      prev.addEventListener('click', () => { window.__pretzelLogPage = Math.max(0, (window.__pretzelLogPage||0)-1); render(); });
    }
    if (next && !next.__bound){
      next.__bound = true;
      next.addEventListener('click', () => { window.__pretzelLogPage = (window.__pretzelLogPage||0)+1; render(); });
    }

    render();
  }

  function refreshLists(){
    const s = stateCache;
    if (!s) return;

    const teams = (s.teams || []).map(t => ({ id: t.id, name: t.name }));
    const players = (s.players || []).map(p => ({ id: p.id, name: p.name }));

    fillSelect($('teamSelect'), teams, 'Select…');
    fillSelect($('newPlayerTeam'), teams, 'No team');
    fillSelect($('moveTeam'), teams, 'No team');
    fillSelect($('playerSelect'), players, 'Select…');

    // Notification + target dropdowns
    fillSelect($('pushTeam'), teams, 'Select team…');
    fillSelect($('pushPlayer'), players, 'Select player…');
    fillSelect($('targetPlayer'), players, 'Select player…');
    // For targets: you can target anyone (including across teams)
    fillSelect($('targetTo'), players, 'Select target…');

    // Keep statusSelect + other inputs as-is
  }

  async function loadState(){
    const data = await api('getState', {});
    stateCache = data.state || data;
    refreshLists();
    renderSnapshot(stateCache);
    renderPrize(stateCache);
    toast('State loaded');
  }
  function money(n){
    const x = Number(n||0) || 0;
    return x.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }

  function renderPrize(state){
    const p = (state && state.prize) ? state.prize : null;
    const cur = $('prizeCurrent');
    const hist = $('prizeHistory');
    if(cur) cur.textContent = p ? ('$' + money(p.amount)) : '$0';
    if(hist){
      const arr = (p && Array.isArray(p.history)) ? p.history.slice().reverse().slice(0,40) : [];
      hist.textContent = arr.length ? arr.map(e=>{
        const t = new Date(e.ts || Date.now()).toLocaleString();
        if(e.kind==='set') return `[${t}] SET → $${money(e.amount)}${e.note?` — ${e.note}`:''}`;
        if(e.kind==='add') return `[${t}] +$${money(e.delta)} → $${money(e.amount)}${e.note?` — ${e.note}`:''}`;
        if(e.kind==='sub') return `[${t}] -$${money(e.delta)} → $${money(e.amount)}${e.note?` — ${e.note}`:''}`;
        return `[${t}] $${money(e.amount||0)}`;
      }).join('\n') : 'No prize edits yet.';
    }
  }


  // ---- Wire UI ----
  async function wire(){
    // Logout
    const logoutBtn = $('logoutBtn');
    if (logoutBtn){
      logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        setToken('');
        showLogin();
        toast('Logged out');
      });
    }

    // Login
    $('al').addEventListener('click', async () => {
      const u = ($('au').value || '').trim();
      const p = ($('ap').value || '').trim();
      $('alog').textContent = '';
      try {
        const data = await api('adminLogin', { username: u, password: p });
        if (!data || !data.token) throw new Error('No token returned');
        setToken(data.token);
        showAuthed();
        toast('Admin unlocked');
        await loadState();
      } catch (e){
        $('alog').textContent = e.message;
        toast(e.message, 'err');
      }
    });

    // Buttons
    $('load').addEventListener('click', () => loadState().catch(e => toast(e.message,'err')));
    $('seed').addEventListener('click', async () => {
      try {
        await api('seedDemo', {});
        toast('Seeded demo data');
        await loadState();
      } catch (e){ toast(e.message,'err'); }
    });
    $('refreshBtn').addEventListener('click', () => { refreshLists(); toast('Lists refreshed'); });

    $('addTeamBtn').addEventListener('click', async () => {
      const name = ($('newTeamName').value || '').trim();
      if (!name) return toast('Team name required','err');
      try {
        await api('addTeam', { name });
        $('teamResult').textContent = 'Team created.';
        $('newTeamName').value = '';
        await loadState();
      } catch (e){ $('teamResult').textContent = e.message; toast(e.message,'err'); }
    });

    $('renameTeamBtn').addEventListener('click', async () => {
      const teamId = $('teamSelect').value;
      const name = ($('renameTeam').value || '').trim();
      if (!teamId) return toast('Pick a team','err');
      if (!name) return toast('New name required','err');
      try {
        await api('renameTeam', { teamId, name });
        $('teamResult').textContent = 'Team renamed.';
        $('renameTeam').value = '';
        await loadState();
      } catch (e){ $('teamResult').textContent = e.message; toast(e.message,'err'); }
    });

    $('deleteTeamBtn').addEventListener('click', async () => {
      const teamId = $('teamSelect').value;
      if (!teamId) return toast('Pick a team','err');
      if (!confirm('Delete this team? Players will be unassigned.')) return;
      try {
        await api('deleteTeam', { teamId });
        $('teamResult').textContent = 'Team deleted.';
        await loadState();
      } catch (e){ $('teamResult').textContent = e.message; toast(e.message,'err'); }
    });

    $('addPlayerBtn').addEventListener('click', async () => {
      const name = ($('newPlayerName').value || '').trim();
      const teamId = $('newPlayerTeam').value || null;
      if (!name) return toast('Player name required','err');
      try {
        await api('addPlayer', { name, teamId });
        $('playerResult').textContent = 'Player added.';
        $('newPlayerName').value = '';
        await loadState();
      } catch (e){ $('playerResult').textContent = e.message; toast(e.message,'err'); }
    });

    $('renamePlayerBtn').addEventListener('click', async () => {
      const playerId = $('playerSelect').value;
      const name = ($('renamePlayer').value || '').trim();
      if (!playerId) return toast('Pick a player','err');
      if (!name) return toast('New name required','err');
      try {
        await api('renamePlayer', { playerId, name });
        $('playerResult').textContent = 'Player renamed.';
        $('renamePlayer').value = '';
        await loadState();
      } catch (e){ $('playerResult').textContent = e.message; toast(e.message,'err'); }
    });

    $('movePlayerBtn').addEventListener('click', async () => {
      const playerId = $('playerSelect').value;
      const teamId = $('moveTeam').value || null;
      if (!playerId) return toast('Pick a player','err');
      try {
        await api('movePlayer', { playerId, teamId });
        $('playerResult').textContent = 'Player moved.';
        await loadState();
      } catch (e){ $('playerResult').textContent = e.message; toast(e.message,'err'); }
    });

    $('deletePlayerBtn').addEventListener('click', async () => {
      const playerId = $('playerSelect').value;
      if (!playerId) return toast('Pick a player','err');
      if (!confirm('Remove this player?')) return;
      try {
        await api('deletePlayer', { playerId });
        $('playerResult').textContent = 'Player removed.';
        await loadState();
      } catch (e){ $('playerResult').textContent = e.message; toast(e.message,'err'); }
    });

    $('addKillBtn').addEventListener('click', async () => {
      const playerId = $('playerSelect').value;
      if (!playerId) return toast('Pick a player','err');
      try {
        await api('addKill', { playerId });
        toast('+1 kill');
        await loadState();
      } catch (e){ toast(e.message,'err'); }
    });

    $('applyStatusBtn').addEventListener('click', async () => {
      const playerId = $('playerSelect').value;
      const status = $('statusSelect').value;
      const killsSet = $('killsSet').value;
      const logMsg = ($('logMsg').value || '').trim();
      if (!playerId) return toast('Pick a player','err');
      try {
        await api('updatePlayer', {
          playerId,
          status,
          kills: killsSet === '' ? null : Number(killsSet),
          logMsg
        });
        $('statusResult').textContent = 'Updated.';
        $('logMsg').value = '';
        await loadState();
      } catch (e){ $('statusResult').textContent = e.message; toast(e.message,'err'); }
    });

    // ---- Notifications ----
    const setPushStatus=(t)=>{ const el=$('pushResult'); if(el) el.textContent=t; };
    const senderVal=()=>($('pushSender')?.value||'').trim();
    const titleVal=()=>($('pushTitle')?.value||'Pretzel HQ').trim()||'Pretzel HQ';
    const msgVal=()=>($('pushMsg')?.value||'').trim();

    $('pushAllBtn')?.addEventListener('click', async()=>{
      const message=msgVal(); if(!message) return toast('Message required','err');
      try{
        setPushStatus('Sending to everyone…');
        const res=await api('adminPushAll',{ sender: senderVal(), title: titleVal(), message });
        setPushStatus(`Sent. matched=${res.matched||0} success=${res.sent||0} failed=${res.failed||0}`);
        toast('Broadcast sent');
      }catch(e){ setPushStatus(e.message); toast(e.message,'err'); }
    });

    $('pushTeamBtn')?.addEventListener('click', async()=>{
      const teamId=$('pushTeam')?.value||''; const message=msgVal();
      if(!teamId) return toast('Pick a team','err');
      if(!message) return toast('Message required','err');
      try{
        setPushStatus('Sending to team…');
        const res=await api('adminPushTeam',{ teamId, sender: senderVal(), title: titleVal(), message });
        setPushStatus(`Sent. matched=${res.matched||0} success=${res.sent||0} failed=${res.failed||0}`);
        toast('Team push sent');
      }catch(e){ setPushStatus(e.message); toast(e.message,'err'); }
    });

    $('pushPlayerBtn')?.addEventListener('click', async()=>{
      const playerId=$('pushPlayer')?.value||''; const message=msgVal();
      if(!playerId) return toast('Pick a player','err');
      if(!message) return toast('Message required','err');
      try{
        setPushStatus('Sending DM…');
        const res=await api('adminPushPlayer',{ playerId, sender: senderVal(), title: titleVal(), message });
        setPushStatus(`Sent. matched=${res.matched||0} success=${res.sent||0} failed=${res.failed||0}`);
        toast('DM sent');
      }catch(e){ setPushStatus(e.message); toast(e.message,'err'); }
    });

    // ---- Targets ----
    const setTargetStatus=(t)=>{ const el=$('targetResult'); if(el) el.textContent=t; };
    $('setTargetBtn')?.addEventListener('click', async()=>{
      const playerId=$('targetPlayer')?.value||'';
      const targetId=$('targetTo')?.value||'';
      if(!playerId || !targetId) return toast('Pick player + target','err');
      if(playerId===targetId) return toast('Player cannot target themselves','err');
      try{
        await api('adminSetTarget',{ playerId, targetId });
        setTargetStatus('Target set.');
        toast('Target saved');
      }catch(e){ setTargetStatus(e.message); toast(e.message,'err'); }
    });
    $('clearTargetBtn')?.addEventListener('click', async()=>{
      const playerId=$('targetPlayer')?.value||'';
      if(!playerId) return toast('Pick a player','err');
      try{
        await api('adminClearTarget',{ playerId });
        setTargetStatus('Cleared.');
        toast('Target cleared');
      }catch(e){ setTargetStatus(e.message); toast(e.message,'err'); }
    });

    // ---- Stats ----
    async function refreshStats(){
      try{
        const st=await api('adminStats');
        $('stPlayers').textContent = String(st.players?.total ?? '—');
        $('stPush').textContent = String(st.push?.totalSubs ?? '—');
        $('stLogins').textContent = String(st.logins?.total ?? '—');
        $('stVisits').textContent = String(st.visits?.uniqueToday ?? '—');
        $('stTurn').textContent = String(st.reviews?.avgTurnaround ?? '—');
        $('statsNote').textContent = `Alive ${st.players?.alive ?? '—'} • Pending reviews ${st.reviews?.pending ?? '—'}`;
      }catch(e){ $('statsNote').textContent = e.message; }
    }
    $('statsRefresh')?.addEventListener('click', refreshStats);
    // auto refresh once after login

    setTimeout(refreshStats, 600);

    // ---- Prize Pool ----
    function setPrizeStatus(t){ const el=$('prizeStatus'); if(el) el.textContent=t||'—'; }
    async function prizeAction(mode){
      try{
        setPrizeStatus('Saving…');
        const amount = Number($('prizeSet')?.value || 0);
        const delta = Number($('prizeDelta')?.value || 0);
        const note = ($('prizeNote')?.value || '').trim();
        const res = await api('adminSetPrize', { mode, amount, delta, note });
        // reload state so prize history stays in sync
        await loadState();
        setPrizeStatus('Saved.');
        toast('Prize updated');
      }catch(e){
        setPrizeStatus(e.message);
        toast(e.message,'err');
      }
    }
    $('btnPrizeSet')?.addEventListener('click', ()=>prizeAction('set'));
    $('btnPrizeAdd')?.addEventListener('click', ()=>prizeAction('add'));
    $('btnPrizeSub')?.addEventListener('click', ()=>prizeAction('sub'));

  }

  // ---- Boot ----
  (async () => {
    await wire();

    const token = getToken();
    if (token) {
      const ok = await attemptVerify();
      if (ok) {
        showAuthed();
        loadState().catch(() => {});
        return;
      }
      setToken('');
    }

    showLogin();
  })();
})();


// ---- v30 bulk add + reliability helpers ----
(function(){
  const $ = (id) => document.getElementById(id);

  function fillAnySelect(id, items, placeholder){
    const el = $(id);
    if(!el) return;
    el.innerHTML = '';
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = placeholder || '—';
    el.appendChild(opt);
    for (const it of items || []){
      const o = document.createElement('option');
      o.value = it.id;
      o.textContent = it.name;
      el.appendChild(o);
    }
  }

  async function syncBulkTeamSelect(){
    try{
      const data = await fetch('/.netlify/functions/getState', { cache:'no-store' }).then(r=>r.json());
      const st = data.state || data || {};
      fillAnySelect('bulkPlayerTeam', st.teams || [], 'No team');
    }catch(e){}
  }

  async function wireBulk(){
    await syncBulkTeamSelect();
    $('refreshBtn')?.addEventListener('click', syncBulkTeamSelect);

    $('bulkAddTeamsBtn')?.addEventListener('click', async ()=>{
      const raw = ($('bulkTeamNames')?.value || '').trim();
      if(!raw) return;
      const out = $('bulkTeamsResult');
      try{
        if(out) out.textContent = 'Adding…';
        const res = await api('bulkAddTeams', { names: raw });
        if(out) out.textContent = `Created ${res.created?.length || 0} • skipped ${res.skipped?.length || 0}`;
        $('bulkTeamNames').value = '';
        await loadState();
        await syncBulkTeamSelect();
        toast('Teams added');
      }catch(e){
        if(out) out.textContent = e.message || 'Failed';
        toast(e.message || 'Failed','err');
      }
    });

    $('bulkAddPlayersBtn')?.addEventListener('click', async ()=>{
      const raw = ($('bulkPlayerNames')?.value || '').trim();
      const teamId = $('bulkPlayerTeam')?.value || null;
      if(!raw) return;
      const out = $('bulkPlayersResult');
      try{
        if(out) out.textContent = 'Adding…';
        const res = await api('bulkAddPlayers', { names: raw, teamId });
        if(out) out.textContent = `Created ${res.created?.length || 0} • skipped ${res.skipped?.length || 0}`;
        $('bulkPlayerNames').value = '';
        await loadState();
        await syncBulkTeamSelect();
        toast('Players added');
      }catch(e){
        if(out) out.textContent = e.message || 'Failed';
        toast(e.message || 'Failed','err');
      }
    });
  }

  // Load state immediately after login and periodically refresh
  const oldShowAuthed = typeof showAuthed === 'function' ? showAuthed : null;
  if (oldShowAuthed){
    window.showAuthed = function(){
      oldShowAuthed();
      loadState().catch(()=>{});
      syncBulkTeamSelect().catch(()=>{});
    };
  }

  // Monkey patch addTeam/addPlayer buttons to retry after auth
  const oldToast = toast;
  function authHint(msg){
    oldToast(msg || 'Admin action failed. Refresh and log in again.','err');
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    wireBulk().catch(()=>{});
    setInterval(()=>{ 
      const app = $('adminApp');
      if(app && app.style.display !== 'none'){ loadState().catch(()=>{}); }
    }, 30000);
  });
})();


// ---- v31 bulk remove players ----
(function(){
  const $ = (id) => document.getElementById(id);

  async function bulkRemovePlayers(){
    const raw = ($('bulkRemoveNames')?.value || '').trim();
    const out = $('bulkRemoveResult');
    if(!raw){
      if(out) out.textContent = 'Paste names first.';
      return;
    }

    const wanted = Array.from(new Set(raw.split(/[\n,]+/).map(s => s.trim()).filter(Boolean)));
    if(!wanted.length) return;

    try{
      if(out) out.textContent = 'Checking players…';
      const data = await api('getState', {});
      const st = data.state || data || {};
      const players = Array.isArray(st.players) ? st.players : [];
      const byName = new Map(players.map(p => [String(p.name || '').trim().toLowerCase(), p]));
      const matched = [];
      const missing = [];

      for(const name of wanted){
        const p = byName.get(name.toLowerCase());
        if(p) matched.push(p);
        else missing.push(name);
      }

      if(!matched.length){
        if(out) out.textContent = missing.length ? `No matches. Missing: ${missing.slice(0,8).join(', ')}` : 'No matches.';
        return;
      }

      const preview = matched.slice(0,12).map(p => p.name).join(', ');
      const ok = confirm(`Remove ${matched.length} player(s)?\n\n${preview}${matched.length > 12 ? ' ...' : ''}`);
      if(!ok) return;

      if(out) out.textContent = `Removing ${matched.length}…`;

      let removed = 0;
      let failed = 0;
      for(const p of matched){
        try{
          await api('deletePlayer', { playerId: p.id });
          removed++;
        }catch(e){
          failed++;
        }
      }

      $('bulkRemoveNames').value = '';
      if(out){
        const missingTxt = missing.length ? ` • missing ${missing.length}` : '';
        const failedTxt = failed ? ` • failed ${failed}` : '';
        out.textContent = `Removed ${removed}${missingTxt}${failedTxt}`;
      }

      try{ await loadState(); }catch(e){}
      try{ toast(`Removed ${removed} player(s)`); }catch(e){}
    }catch(e){
      if(out) out.textContent = e.message || 'Failed';
      try{ toast(e.message || 'Failed','err'); }catch(_e){}
    }
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    $('bulkRemovePlayersBtn')?.addEventListener('click', bulkRemovePlayers);
  });
})();


/* v32 checkbox select remove */
(function(){
  const $ = id => document.getElementById(id);

  function renderSelectablePlayers(players){
    const box = $('bulkPlayerList');
    if(!box) return;
    box.innerHTML = '';
    for(const p of players){
      const row = document.createElement('label');
      row.style.display = 'flex';
      row.style.alignItems = 'center';
      row.style.gap = '8px';
      row.style.padding = '6px 4px';
      row.style.cursor = 'pointer';

      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.value = p.id;

      const name = document.createElement('div');
      name.textContent = p.name + (p.teamId ? '' : '');
      name.style.flex = '1';

      row.appendChild(cb);
      row.appendChild(name);
      box.appendChild(row);
    }
  }

  async function refreshSelectablePlayers(){
    try{
      const data = await api('getState', {});
      const st = data.state || data || {};
      const players = Array.isArray(st.players) ? st.players.slice().sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''))) : [];
      renderSelectablePlayers(players);
    }catch(e){}
  }

  async function removeSelectedPlayers(){
    const out = $('bulkSelectResult');
    const ids = [...document.querySelectorAll('#bulkPlayerList input:checked')].map(x => x.value);
    if(!ids.length){
      if(out) out.textContent = 'Select players first.';
      return;
    }
    const ok = confirm(`Remove ${ids.length} selected player(s)?`);
    if(!ok) return;

    let removed = 0;
    let failed = 0;
    if(out) out.textContent = `Removing ${ids.length}...`;

    for(const id of ids){
      try{
        await api('deletePlayer', { playerId:id });
        removed++;
      }catch(e){
        failed++;
      }
    }

    if(out) out.textContent = `Removed ${removed}${failed ? ` • failed ${failed}` : ''}`;
    try{ await loadState(); }catch(e){}
    try{ await refreshSelectablePlayers(); }catch(e){}
    try{ toast(`Removed ${removed} player(s)`); }catch(e){}
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    refreshSelectablePlayers();
    $('refreshBtn')?.addEventListener('click', refreshSelectablePlayers);
    $('selectAllPlayersBtn')?.addEventListener('click', ()=>{
      document.querySelectorAll('#bulkPlayerList input').forEach(x => x.checked = true);
    });
    $('clearPlayersBtn')?.addEventListener('click', ()=>{
      document.querySelectorAll('#bulkPlayerList input').forEach(x => x.checked = false);
    });
    $('removeSelectedPlayersBtn')?.addEventListener('click', removeSelectedPlayers);
  });
})();
