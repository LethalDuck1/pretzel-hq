const { json, isAdmin, mkId, loadState, saveState, pushLog } = require("./_state");

exports.handler = async (event) => {
  try{
    if(!isAdmin(event)) return json(401, { error:"Unauthorized" });
    const body = JSON.parse(event.body || "{}");
    const name = String(body.name || "").trim();
    if(!name) return json(400, { error:"Missing team name" });

    const state = await loadState();
    state.teams = Array.isArray(state.teams) ? state.teams : [];
    if(state.teams.some(t => String(t.name||"").toLowerCase() === name.toLowerCase())){
      return json(400, { error:"Team name already exists" });
    }

    state.teams.push({ id: mkId("t"), name });
    pushLog(state, `Team created: ${name}`);
    await saveState(state);
    return json(200, { ok:true });
  }catch{
    return json(500, { error:"Failed to add team" });
  }
};
