const { json, loadState, saveState, pushLog } = require("./_state");
const { isAdminAuthed } = require("./_adminGuard");

exports.handler = async (event) => {
  if (!(await isAdminAuthed(event))) return json(401, { error:"Unauthorized" });
  let body = {};
  try { body = JSON.parse(event.body || "{}"); } catch {}
  const playerId = String(body.playerId || "").trim();
  if (!playerId) return json(400, { error:"Missing playerId" });

  const st = await loadState();
  st.players = Array.isArray(st.players) ? st.players : [];
  const p = st.players.find(x => String(x.id) === playerId);
  if (!p) return json(404, { error:"Player not found" });

  p.kills = Math.max(0, Number(p.kills || 0) + 1);
  pushLog(st, `Kill added:${p.name} now has ${p.kills}`);
  await saveState(st);
  return json(200, { ok:true, player:p });
};
