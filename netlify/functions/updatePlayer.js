const { loadState, saveState, json, isAdminAuthed } = require('./_state');

// Update a player's fields (kills/status/team/name/notes)
// body: { id, patch: { name?, teamId?, status?, kills?, notes? } }
exports.handler = async (event) => {
  if (!isAdminAuthed(event)) return json(401, { ok:false, error:'Unauthorized' });
  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch {}
  // Support both formats:
  // 1) { id, patch:{...} }
  // 2) { playerId, status, kills, logMsg }
  const id = String(body.id || body.playerId || '').trim();
  const patch = (body.patch && typeof body.patch === 'object')
    ? body.patch
    : {
        name: body.name,
        teamId: body.teamId,
        status: body.status,
        kills: body.kills,
        notes: body.notes,
      };
  if (!id) return json(400, { ok:false, error:'Missing id' });

  const st = await loadState();
  st.players = Array.isArray(st.players) ? st.players : [];
  const idx = st.players.findIndex(p => String(p.id) === id);
  if (idx < 0) return json(404, { ok:false, error:'Player not found' });

  const cur = st.players[idx] || {};
  const next = { ...cur };

  if (patch.name != null) next.name = String(patch.name).trim().slice(0, 48);
  if (patch.teamId != null) next.teamId = String(patch.teamId).trim().slice(0, 48);
  if (patch.status != null) next.status = String(patch.status).trim().toLowerCase();
  if (patch.kills != null) {
    const k = Number(patch.kills);
    next.kills = Number.isFinite(k) ? Math.max(0, Math.floor(k)) : (cur.kills || 0);
  }
  if (patch.notes != null) next.notes = String(patch.notes).trim().slice(0, 240);

  st.players[idx] = next;

  // Optional admin log message
  const logMsg = String(body.logMsg || '').trim();
  if (logMsg){
    st.logs = Array.isArray(st.logs) ? st.logs : [];
    st.logs.push({
      ts: Date.now(),
      type: 'admin',
      msg: logMsg,
      playerId: id,
    });
    if (st.logs.length > 600) st.logs = st.logs.slice(st.logs.length - 600);
  }

  await saveState(st);
  return json(200, { ok:true, player: next });
};
