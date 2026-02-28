const { json, isAdmin, loadState, saveState, pushLog, countTeamMembers } = require("./_state");

exports.handler = async (event) => {
  try{
    if(!isAdmin(event)) return json(401, { error:"Unauthorized" });
    const body = JSON.parse(event.body || "{}");
    const playerId = String(body.playerId || "");
    const teamId = String(body.teamId || "");
    if(!playerId) return json(400, { error:"Missing playerId" });
    if(!teamId) return json(400, { error:"Missing teamId" });

    const state = await loadState();
    state.players = Array.isArray(state.players) ? state.players : [];
    state.teams = Array.isArray(state.teams) ? state.teams : [];

    const p = state.players.find(x => x.id === playerId);
    if(!p) return json(404, { error:"Player not found" });

    const team = state.teams.find(t => t.id === teamId);
    if(!team) return json(400, { error:"Invalid team" });

    if(countTeamMembers(state, teamId) >= 5){
      return json(400, { error:"Team is full (max 5)" });
    }

    p.teamId = teamId;
    pushLog(state, `Player moved: ${p.name} → ${team.name}`);
    await saveState(state);

    return json(200, { ok:true });
  }catch(e){
    console.error("movePlayer failed:", e);
    return json(500, { error:"Failed to move player", detail: e?.message || "unknown" });
  }
};
