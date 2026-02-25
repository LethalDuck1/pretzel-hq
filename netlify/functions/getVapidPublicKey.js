const { json } = require("./_state");
const { cfgWebPush } = require("./_push");

exports.handler = async () => {
  try{
    const { pub } = cfgWebPush();
    return json(200, { publicKey: pub });
  }catch(e){
    console.error("getVapidPublicKey failed:", e);
    return json(500, { error:"Push not configured", detail: e?.message || "unknown" });
  }
};
