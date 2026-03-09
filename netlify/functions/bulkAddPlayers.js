const { json, loadState, saveState, pushLog, mkId, countTeamMembers } = require("./_state");
const { isAdminAuthed } = require("./_adminGuard");

exports.handler = async (event) => {
  if (!(await isAdminAuthed(event))) return json(401, { error:"Unauthorized" });
  let body = {};
  try { body = JSON.parse(event.body || "{}"); } catch {}
  const raw = String(body.names || body.text || "").trim();
  const teamId = body.teamId ? String(body.teamId) : null;
  if (!raw) return json(400, { error:"Missing names" });

  const st = await loadState();
  st.players = Array.isArray(st.players) ? st.players : [];
  st.teams = Array.isArray(st.teams) ? st.teams : [];
  if (teamId && !st.teams.some(t => String(t.id) === teamId)) return json(400, { error:"Team not found" });

  const names = Array.from(new Set(raw.split(/[\n,]+/).map(s => s.trim()).filter(Boolean))).slice(0, 300);
  const existing = new Set(st.players.map(p => String(p.name || "").toLowerCase()));
  const created = [];
  const skipped = [];

  for (const name of names){
    const key = name.toLowerCase();
    if (existing.has(key)) { skipped.push({ name, reason:"exists" }); continue; }
    if (teamId && countTeamMembers(st, teamId) >= 5) { skipped.push({ name, reason:"team_full" }); continue; }
    const player = { id: mkId("p"), name, teamId: teamId || null, status:"alive", kills:0, buybackUsed:false };
    st.players.push(player);
    existing.add(key);
    created.push(player);
  }

  pushLog(st, `Bulk players:${created.length} created`);
  await saveState(st);
  return json(200, { ok:true, created, skipped });
};
