const { json, loadState, saveState, pushLog, mkId } = require("./_state");
const { isAdminAuthed } = require("./_adminGuard");

exports.handler = async (event) => {
  if (!(await isAdminAuthed(event))) return json(401, { error:"Unauthorized" });
  let body = {};
  try { body = JSON.parse(event.body || "{}"); } catch {}
  const raw = String(body.names || body.text || "").trim();
  if (!raw) return json(400, { error:"Missing names" });

  const names = Array.from(new Set(raw.split(/[\n,]+/).map(s => s.trim()).filter(Boolean))).slice(0, 200);
  const st = await loadState();
  st.teams = Array.isArray(st.teams) ? st.teams : [];
  const existing = new Set(st.teams.map(t => String(t.name || "").toLowerCase()));
  const created = [];
  const skipped = [];

  for (const name of names){
    const key = name.toLowerCase();
    if (existing.has(key)) { skipped.push(name); continue; }
    const team = { id: mkId("team"), name };
    st.teams.push(team);
    existing.add(key);
    created.push(team);
  }

  pushLog(st, `Bulk teams:${created.length} created`);
  await saveState(st);
  return json(200, { ok:true, created, skipped });
};
