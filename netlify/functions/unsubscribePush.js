const { json } = require("./_state");
const { removeSub } = require("./_push");

exports.handler = async (event) => {
  try{
    const body = JSON.parse(event.body || "{}");
    const endpoint = body.endpoint;
    if(!endpoint) return json(400, { error:"Missing endpoint" });
    const count = await removeSub(endpoint);
    return json(200, { ok:true, count });
  }catch(e){
    console.error("unsubscribePush failed:", e);
    return json(400, { error:"Failed to unsubscribe", detail: e?.message || "unknown" });
  }
};
