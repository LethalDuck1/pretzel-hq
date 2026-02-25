const { json, isAdmin, loadState, saveState, pushLog } = require("./_state");

exports.handler = async (event) => {
  try{
    if(!isAdmin(event)) return json(401, { error:"Unauthorized" });
    const body = JSON.parse(event.body || "{}");
    const playerId = String(body.playerId || "").trim();
    if(!playerId) return json(400, { error:"Missing playerId" });

    const state = await loadState();
    const p = (state.players || []).find(x => x.id === playerId);
    if(!p) return json(404, { error:"Player not found" });

    state.players = (state.players || []).filter(x => x.id !== playerId);
    pushLog(state, `Player removed: ${p.name}`);
    await saveState(state);
    return json(200, { ok:true });
  }catch{
    return json(500, { error:"Failed to delete player" });
  }
};
