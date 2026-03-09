const { loadState, saveState, json, pushLog, normStatus } = require("./_state");
const { isAdminAuthed } = require("./_adminGuard");

exports.handler = async (event) => {
  if (!(await isAdminAuthed(event))) return json(401, { ok:false, error:"Unauthorized" });

  let body = {};
  try { body = JSON.parse(event.body || "{}"); } catch {}

  const id = String(body.id || body.playerId || "").trim();
  if (!id) return json(400, { ok:false, error:"Missing player id" });

  const st = await loadState();
  st.players = Array.isArray(st.players) ? st.players : [];
  st.teams = Array.isArray(st.teams) ? st.teams : [];

  const idx = st.players.findIndex(p => String(p.id) === id);
  if (idx < 0) return json(404, { ok:false, error:"Player not found" });

  const cur = st.players[idx];
  const next = { ...cur };

  const patch = (body.patch && typeof body.patch === "object") ? body.patch : body;

  if (patch.name != null) {
    const name = String(patch.name).trim().slice(0, 48);
    if (!name) return json(400, { ok:false, error:"Name required" });
    next.name = name;
  }
  if (patch.teamId != null) {
    const teamId = String(patch.teamId || "").trim();
    if (teamId && !st.teams.some(t => String(t.id) === teamId)) {
      return json(400, { ok:false, error:"Invalid team" });
    }
    next.teamId = teamId || null;
  }
  if (patch.status != null) next.status = normStatus(patch.status);
  if (patch.kills != null) {
    const n = Number(patch.kills);
    next.kills = Number.isFinite(n) ? Math.max(0, Math.floor(n)) : (cur.kills || 0);
  }
  if (patch.notes != null) next.notes = String(patch.notes).trim().slice(0, 240);
  if (patch.buybackUsed != null) next.buybackUsed = !!patch.buybackUsed;

  st.players[idx] = next;

  const logMsg = String(body.logMsg || "").trim();
  if (logMsg) pushLog(st, logMsg);
  else {
    const changes = [];
    if (next.status !== cur.status) changes.push(`status ${cur.status || "alive"}→${next.status}`);
    if ((next.kills || 0) !== (cur.kills || 0)) changes.push(`kills ${(cur.kills||0)}→${(next.kills||0)}`);
    if (next.teamId !== cur.teamId) changes.push(`team changed`);
    if (next.name !== cur.name) changes.push(`name changed`);
    if (changes.length) pushLog(st, `Player updated:${next.name} (${changes.join(", ")})`);
  }

  await saveState(st);
  return json(200, { ok:true, player: next });
};
