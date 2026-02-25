const { json, isAdmin } = require("./_state");
const { sendToSubs } = require("./_push");

exports.handler = async (event) => {
  try{
    if(!isAdmin(event)) return json(401, { error:"Unauthorized" });
    const body = JSON.parse(event.body || "{}");
    const title = String(body.title || "Pretzel HQ");
    const message = String(body.message || "Test notification");
    const tags = Array.isArray(body.tags) ? body.tags : [];
    const res = await sendToSubs({ title, message, kind:"test", ts: new Date().toISOString() }, { tags });
    return json(200, { ok:true, ...res });
  }catch(e){
    console.error("pushTest failed:", e);
    return json(500, { error:"Failed to send", detail: e?.message || "unknown" });
  }
};
