const { json, isAdmin, mkId, loadState, saveState, pushLog, countTeamMembers } = require("./_state");

exports.handler = async (event) => {
  try{
    if(!isAdmin(event)) return json(401, { error:"Unauthorized" });
    const body = JSON.parse(event.body || "{}");
    const name = String(body.name || "").trim();
    const teamId = String(body.teamId || "").trim();
    if(!name) return json(400, { error:"Missing player name" });

    const state = await loadState();
    state.players = Array.isArray(state.players) ? state.players : [];

    let assignedTeam = null;
    if(teamId){
      assignedTeam = (state.teams || []).find(t => t.id === teamId);
      if(!assignedTeam) return json(404, { error:"Team not found" });
      if(countTeamMembers(state, teamId) >= 5) return json(400, { error:"Team is already at 5 players" });
    }

    state.players.push({
      id: mkId("p"),
      name,
      teamId: teamId || null,
      status: "alive",
      kills: 0
    });

    pushLog(state, assignedTeam ? `Player added: ${name} → ${assignedTeam.name}` : `Player added: ${name}`);
    await saveState(state);
    return json(200, { ok:true });
  }catch(e){ console.error(\"addPlayer failed:", e); return json(500, { error:"Failed to add player", detail: e && e.message ? e.message : "unknown" }); }
};
