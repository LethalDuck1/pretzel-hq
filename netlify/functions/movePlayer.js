const { json, isAdmin, loadState, saveState, pushLog, countTeamMembers } = require("./_state");

exports.handler = async (event) => {
  try{
    if(!isAdmin(event)) return json(401, { error:"Unauthorized" });
    const body = JSON.parse(event.body || "{}");
    const playerId = String(body.playerId || "").trim();
    const teamId = String(body.teamId || "").trim();
    if(!playerId) return json(400, { error:"Missing playerId" });

    const state = await loadState();
    const p = (state.players || []).find(x => x.id === playerId);
    if(!p) return json(404, { error:"Player not found" });

    if(teamId){
      const team = (state.teams || []).find(t => t.id === teamId);
      if(!team) return json(404, { error:"Team not found" });
      if(p.teamId !== teamId && countTeamMembers(state, teamId) >= 5) return json(400, { error:"Team is already at 5 players" });
      p.teamId = teamId;
      pushLog(state, `Player moved: ${p.name} → ${team.name}`);
    } else {
      p.teamId = null;
      pushLog(state, `Player unassigned: ${p.name}`);
    }

    await saveState(state);
    return json(200, { ok:true });
  }catch{
    return json(500, { error:"Failed to move player" });
  }
};
