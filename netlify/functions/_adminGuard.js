const { verifySession, verifyToken } = require("./_adminAuth");

function readCookie(event, name){
  const raw = (event.headers?.cookie || event.headers?.Cookie || "").toString();
  if (!raw) return "";
  const parts = raw.split(";").map(s => s.trim());
  for (const p of parts){
    if (!p) continue;
    const idx = p.indexOf("=");
    if (idx === -1) continue;
    const k = p.slice(0, idx).trim();
    const v = p.slice(idx + 1).trim();
    if (k === name) return decodeURIComponent(v);
  }
  return "";
}

async function isAdminAuthed(event, isAdminKeyFn){
  try {
    if (isAdminKeyFn && isAdminKeyFn(event)) return true;

    const h = event.headers || {};
    const auth = (h.authorization || h.Authorization || "").toString().trim();
    const bearer = auth.replace(/^Bearer\s+/i, "").trim();
    const headerToken = (h["x-admin-token"] || h["X-Admin-Token"] || "").toString().trim();
    const cookieToken = readCookie(event, "pretzel_admin_token").trim();
    const token = bearer || headerToken || cookieToken;
    if (!token) return false;

    const syncOk = verifyToken(token);
    if (syncOk) return true;

    const session = await verifySession(token);
    return !!session;
  } catch {
    return false;
  }
}

module.exports = { isAdminAuthed };
