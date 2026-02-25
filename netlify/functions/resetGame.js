const { json, isAdmin, saveState, pushLog } = require("./_state");

exports.handler = async (event) => {
  try{
    if(!isAdmin(event)) return json(401, { error:"Unauthorized" });

    const body = JSON.parse(event.body || "{}");
    const keepTeams = body.keepTeams === true;

    const state = {
      lastUpdated: new Date().toISOString(),
      teams: keepTeams ? (body.teams || []) : [],
      players: [],
      log: []
    };

    pushLog(state, keepTeams ? "Game reset (teams kept)." : "Game reset.");
    await saveState(state);
    return json(200, { ok:true });
  }catch(e){ console.error(\"resetGame failed:", e); return json(500, { error:"Failed to reset", detail: e && e.message ? e.message : "unknown" }); }
};
