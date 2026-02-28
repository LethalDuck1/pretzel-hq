const { json } = require("./_state");
const crypto = require("crypto");

exports.handler = async (event) => {
  if(event.httpMethod !== "POST") return json(400, { error: "POST only" });

  let body = {};
  try { body = JSON.parse(event.body || "{}"); } catch(e){ return json(400, { error: "Invalid JSON" }); }

  const user = String(body.username || "").trim();
  const pass = String(body.password || "");

  const ADMIN_USER = process.env.ADMIN_USER || "";
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";

  if(!ADMIN_USER || !ADMIN_PASSWORD){
    return json(500, { error: "Admin credentials not configured" });
  }

  if(user !== ADMIN_USER || pass !== ADMIN_PASSWORD){
    return json(401, { error: "Invalid credentials" });
  }

  const secret = process.env.SESSION_SECRET || ADMIN_PASSWORD;
  const exp = Date.now() + 1000*60*60*24*7; // 7 days
  const payload = { t: "admin", u: ADMIN_USER, iat: Date.now(), exp };
  const payloadB64 = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(payloadB64).digest("base64url");
  const token = `${payloadB64}.${sig}`;

  return json(200, { ok:true, token, exp });
};
