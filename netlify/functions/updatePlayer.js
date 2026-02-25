const { json, isAdmin, loadState, saveState, pushLog, normStatus } = require("./_state");
const { sendToSubs } = require("./_push");

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

    // Push notification (safe: failures won't block admin)
    try{
      const teamTag = p.teamId ? [`team:${p.teamId}`] : [];
      const payload = {
        title: "Pretzel HQ Update",
        message: body.addKill === true
          ? `${p.name} gained a kill (now ${p.kills}).`
          : `Status update: ${p.name} • ${p.status.toUpperCase()} • kills:${p.kills}`,
        kind: body.addKill === true ? "kill" : "status",
        player: { id: p.id, name: p.name, status: p.status, kills: p.kills, teamId: p.teamId || null },
        ts: new Date().toISOString()
      };
      // Send to all subscribers + team subscribers (if you decide to scope later)
      await sendToSubs(payload, { tags: [] });
      if(teamTag.length) await sendToSubs(payload, { tags: teamTag });
    }catch(e){
      console.error("push send failed:", e);
    }

    return json(200, { ok:true });
  }catch(e){ console.error(\"updatePlayer failed:", e); return json(500, { error:"Failed to update player", detail: e && e.message ? e.message : "unknown" }); }
};
