const { json, isAdmin, loadState, saveState, pushLog } = require("./_state");

exports.handler = async (event) => {
  try{
    if(!isAdmin(event)) return json(401, { error:"Unauthorized" });
    const body = JSON.parse(event.body || "{}");
    const teamId = String(body.teamId || "").trim();
    if(!teamId) return json(400, { error:"Missing teamId" });

    const state = await loadState();
    const t = (state.teams || []).find(x => x.id === teamId);
    if(!t) return json(404, { error:"Team not found" });

    (state.players || []).forEach(p => {
      if(p.teamId === teamId) p.teamId = null;
    });

    state.teams = (state.teams || []).filter(x => x.id !== teamId);
    pushLog(state, `Team deleted: ${t.name} (players unassigned)`);
    await saveState(state);
    return json(200, { ok:true });
  }catch(e){ console.error(\"deleteTeam failed:", e); return json(500, { error:"Failed to delete team", detail: e && e.message ? e.message : "unknown" }); }
};
