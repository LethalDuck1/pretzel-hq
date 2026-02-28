const { json, isAdmin, loadState, saveState, pushLog } = require("./_state");

exports.handler = async (event) => {
  try{
    if(!isAdmin(event)) return json(401, { error:"Unauthorized" });
    const body = JSON.parse(event.body || "{}");
    const playerId = String(body.playerId || "");
    const name = String(body.name || "").trim();
    if(!playerId) return json(400, { error:"Missing playerId" });
    if(!name) return json(400, { error:"Player name required" });

    const state = await loadState();
    state.players = Array.isArray(state.players) ? state.players : [];
    const p = state.players.find(x => x.id === playerId);
    if(!p) return json(404, { error:"Player not found" });

    const old = p.name;
    p.name = name;

    pushLog(state, `Player renamed: ${old} → ${name}`);
    await saveState(state);

    return json(200, { ok:true });
  }catch(e){
    console.error("renamePlayer failed:", e);
    return json(500, { error:"Failed to rename player", detail: e?.message || "unknown" });
  }
};
