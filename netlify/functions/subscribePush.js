const { json } = require("./_state");
const { addSub } = require("./_push");

exports.handler = async (event) => {
  try{
    const body = JSON.parse(event.body || "{}");
    const subscription = body.subscription;
    const tags = Array.isArray(body.tags) ? body.tags : [];
    const count = await addSub(subscription, tags);
    return json(200, { ok:true, count });
  }catch(e){
    console.error("subscribePush failed:", e);
    return json(400, { error:"Failed to subscribe", detail: e?.message || "unknown" });
  }
};
