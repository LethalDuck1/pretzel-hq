const { json, isAdmin, loadState, saveState, pushLog, normStatus } = require("./_state");
const { sendToSubs } = require("./_push");

exports.handler = async (event) => {
  try{
    if(!isAdmin(event)) return json(401, { error:"Unauthorized" });

    const body = JSON.parse(event.body || "{}");
    const playerId = String(body.playerId || "");
    if(!playerId) return json(400, { error:"Missing playerId" });

    const state = await loadState();
    state.players = Array.isArray(state.players) ? state.players : [];

    const p = state.players.find(x => x.id === playerId);
    if(!p) return json(404, { error:"Player not found" });

    const before = { status: p.status, kills: p.kills };

    if(body.status !== undefined) p.status = normStatus(body.status);
    if(body.killsSet !== undefined && body.killsSet !== null){
      const ks = Number(body.killsSet);
      if(!Number.isFinite(ks) || ks < 0) return json(400, { error:"Invalid killsSet" });
      p.kills = ks;
    }
    if(body.addKill === true){
      p.kills = (Number(p.kills) || 0) + 1;
    }

    const logText = body.logText ? String(body.logText).trim() : "";
    if(logText) pushLog(state, logText);
    else {
      const changed = [];
      if(before.status !== p.status) changed.push(`status ${before.status}→${p.status}`);
      if(before.kills !== p.kills) changed.push(`kills ${before.kills}→${p.kills}`);
      if(changed.length) pushLog(state, `Update ${p.name}: ${changed.join(", ")}`);
    }

    await saveState(state);

    // Push notification (best-effort)
    try{
      const payload = {
        title: "Pretzel HQ",
        message: body.addKill === true
          ? `${p.name} gained a kill (now ${p.kills}).`
          : `Update: ${p.name} • ${String(p.status).toUpperCase()} • kills:${p.kills}`,
        kind: body.addKill === true ? "kill" : "status",
        ts: new Date().toISOString()
      };
      await sendToSubs(payload, { tags: [] });
    }catch(e){
      console.error("push failed:", e);
    }

    return json(200, { ok:true });
  }catch(e){
    console.error("updatePlayer failed:", e);
    return json(500, { error:"Failed to update player", detail: e?.message || "unknown" });
  }
};
