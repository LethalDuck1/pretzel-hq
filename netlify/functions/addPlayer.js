const { json, isAdmin, loadState, saveState, pushLog, mkId, countTeamMembers } = require("./_state");

exports.handler = async (event) => {
  try{
    if(!isAdmin(event)) return json(401, { error:"Unauthorized" });
    const body = JSON.parse(event.body || "{}");
    const name = String(body.name || "").trim();
    const teamId = body.teamId ? String(body.teamId) : null;
    if(!name) return json(400, { error:"Missing player name" });

    const state = await loadState();
    state.players = Array.isArray(state.players) ? state.players : [];
    state.teams = Array.isArray(state.teams) ? state.teams : [];

    if(state.players.some(p => String(p.name||"").toLowerCase() === name.toLowerCase())){
      return json(400, { error:"Player already exists" });
    }
    if(teamId){
      const exists = state.teams.some(t => t.id === teamId);
      if(!exists) return json(400, { error:"Team not found" });
      if(countTeamMembers(state, teamId) >= 5) return json(400, { error:"Team is full (max 5)" });
    }

    const player = { id: mkId("p"), name, teamId, status:"alive", kills:0 };
    state.players.push(player);
    pushLog(state, `Player added: ${name}`);
    await saveState(state);

    return json(200, { ok:true, player });
  }catch(e){
    console.error("addPlayer failed:", e);
    return json(500, { error:"Failed to add player", detail: e?.message || "unknown" });
  }
};
