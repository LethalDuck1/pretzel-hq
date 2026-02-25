const { json, isAdmin, loadState, saveState, pushLog, normStatus } = require("./_state");

exports.handler = async (event) => {
  try{
    if(!isAdmin(event)) return json(401, { error:"Unauthorized" });
    const body = JSON.parse(event.body || "{}");
    const playerId = String(body.playerId || "").trim();
    if(!playerId) return json(400, { error:"Missing playerId" });

    const state = await loadState();
    const p = (state.players || []).find(x => x.id === playerId);
    if(!p) return json(404, { error:"Player not found" });

    const beforeStatus = p.status || "alive";
    const beforeKills = typeof p.kills === "number" ? p.kills : 0;

    if(body.status !== undefined && body.status !== null){
      p.status = normStatus(body.status);
    } else if(!p.status){
      p.status = "alive";
    }

    if(body.addKill === true){
      p.kills = beforeKills + 1;
    } else if(body.killsSet !== undefined && body.killsSet !== null){
      const k = Number(body.killsSet);
      if(!Number.isFinite(k) || k < 0) return json(400, { error:"Invalid killsSet" });
      p.kills = Math.floor(k);
    } else if(typeof p.kills !== "number"){
      p.kills = 0;
    }

    const logText = body.logText ? String(body.logText).slice(0,140) : null;
    if(logText){
      pushLog(state, logText);
    } else {
      const afterStatus = p.status || "alive";
      const afterKills = typeof p.kills === "number" ? p.kills : 0;
      if(beforeStatus !== afterStatus || beforeKills !== afterKills){
        pushLog(state, `Update: ${p.name} • ${beforeStatus.toUpperCase()}→${afterStatus.toUpperCase()} • kills:${beforeKills}→${afterKills}`);
      }
    }

    await saveState(state);
    return json(200, { ok:true });
  }catch{
    return json(500, { error:"Failed to update player" });
  }
};
