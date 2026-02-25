const { json, isAdmin, loadState, saveState, mkId, pushLog, countTeamMembers, normStatus } = require("./_state");

exports.handler = async (event) => {
  try{
    if(!isAdmin(event)) return json(401, { error:"Unauthorized" });

    const body = JSON.parse(event.body || "{}");
    const name = String(body.name || "").trim();
    const teamId = body.teamId ? String(body.teamId) : null;

    if(!name) return json(400, { error:"Player name required" });

    const state = await loadState();
    state.players = Array.isArray(state.players) ? state.players : [];
    state.teams = Array.isArray(state.teams) ? state.teams : [];

    if(state.players.some(p => String(p.name).toLowerCase() === name.toLowerCase())){
      return json(400, { error:"Player already exists" });
    }

    if(teamId){
      const team = state.teams.find(t => t.id === teamId);
      if(!team) return json(400, { error:"Invalid team" });
      if(countTeamMembers(state, teamId) >= 5){
        return json(400, { error:"Team is full (max 5)" });
      }
    }

    const player = { id: mkId("p"), name, teamId, status: normStatus(body.status), kills: 0 };
    state.players.push(player);

    pushLog(state, `Player added: ${name}${teamId ? " (assigned)" : ""}`);
    await saveState(state);

    return json(200, { ok:true, player });
  }catch(e){
    console.error("addPlayer failed:", e);
    return json(500, { error:"Failed to add player", detail: e?.message || "unknown" });
  }
};
