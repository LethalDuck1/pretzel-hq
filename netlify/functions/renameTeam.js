const { json, isAdmin, loadState, saveState, pushLog } = require("./_state");

exports.handler = async (event) => {
  try{
    if(!isAdmin(event)) return json(401, { error:"Unauthorized" });
    const body = JSON.parse(event.body || "{}");
    const teamId = String(body.teamId || "").trim();
    const name = String(body.name || "").trim();
    if(!teamId || !name) return json(400, { error:"Missing teamId/name" });

    const state = await loadState();
    const t = (state.teams || []).find(x => x.id === teamId);
    if(!t) return json(404, { error:"Team not found" });

    const exists = (state.teams || []).some(x => x.id !== teamId && String(x.name||"").toLowerCase() === name.toLowerCase());
    if(exists) return json(400, { error:"Team name already exists" });

    const old = t.name;
    t.name = name;
    pushLog(state, `Team renamed: ${old} → ${name}`);
    await saveState(state);
    return json(200, { ok:true });
  }catch{
    return json(500, { error:"Failed to rename team" });
  }
};
