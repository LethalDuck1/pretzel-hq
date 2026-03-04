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
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
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
    snap.textContent = JSON.stringify(state, null, 2);
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

    // Keep statusSelect + other inputs as-is
  }

  async function loadState(){
    const data = await api('getState', {});
    stateCache = data.state || data;
    refreshLists();
    renderSnapshot(stateCache);
    toast('State loaded');
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
