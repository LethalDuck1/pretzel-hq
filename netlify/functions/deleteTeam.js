const { json, isAdmin, loadState, saveState, pushLog } = require("./_state");

exports.handler = async (event) => {
  try{
    if(!isAdmin(event)) return json(401, { error:"Unauthorized" });
    const body = JSON.parse(event.body || "{}");
    const teamId = String(body.teamId || "");
    if(!teamId) return json(400, { error:"Missing teamId" });

    const state = await loadState();
    state.teams = Array.isArray(state.teams) ? state.teams : [];
    state.players = Array.isArray(state.players) ? state.players : [];

    const team = state.teams.find(t => t.id === teamId);
    if(!team) return json(404, { error:"Team not found" });

    state.teams = state.teams.filter(t => t.id !== teamId);
    // unassign players
    state.players.forEach(p => { if(p.teamId === teamId) p.teamId = null; });

    pushLog(state, `Team deleted: ${team.name}`);
    await saveState(state);

    return json(200, { ok:true });
  }catch(e){
    console.error("deleteTeam failed:", e);
    return json(500, { error:"Failed to delete team", detail: e?.message || "unknown" });
  }
};
