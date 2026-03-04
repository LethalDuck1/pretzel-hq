const { verifySession } = require("./_adminAuth");

function _readCookie(event, name){
  const raw = (event.headers?.cookie || event.headers?.Cookie || "").toString();
  if(!raw) return "";
  const parts = raw.split(";").map(s=>s.trim());
  for(const p of parts){
    if(!p) continue;
    const idx = p.indexOf("=");
    if(idx === -1) continue;
    const k = p.slice(0, idx).trim();
    const v = p.slice(idx+1).trim();
    if(k === name) return decodeURIComponent(v);
  }
  return "";
}

// Accepts:
// - Authorization: Bearer <token>
// - x-admin-token: <token> (legacy header)
// - Cookie: pretzel_admin_token=<token>
// - Legacy master key via isAdminKeyFn (optional)
async function isAdminAuthed(event, isAdminKeyFn){
  try{
    if(isAdminKeyFn && isAdminKeyFn(event)) return true;

    const h = event.headers || {};
    const auth = (h.authorization || h.Authorization || "").toString();
    const bearer = auth.replace(/^Bearer\s+/i, "").trim();

    const headerToken = (h["x-admin-token"] || h["X-Admin-Token"] || "").toString().trim();
    const cookieToken = _readCookie(event, "pretzel_admin_token").trim();

    const token = bearer || headerToken || cookieToken;
    if(!token) return false;

    const ok = await verifySession(token);
    return !!ok;
  }catch{
    return false;
  }
}

module.exports = { isAdminAuthed };
