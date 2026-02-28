
const { json, bad, ok, readState, saveState, isAdmin } = require("./_state");

function validateState(s){
  if(!s || typeof s!=="object") return "state must be an object";
  if(!Array.isArray(s.teams) || !Array.isArray(s.players)) return "state must include teams[] and players[]";
  // Minimal sanity: ensure ids exist
  for(const t of s.teams){ if(!t || !t.id) return "each team must have id"; }
  for(const p of s.players){ if(!p || !p.id) return "each player must have id"; }
  return null;
}

exports.handler = async (event) => {
  if(!isAdmin(event)) return bad("unauthorized");
  if(event.httpMethod !== "POST") return bad("POST only");
  let body = {};
  try{ body = JSON.parse(event.body || "{}"); }catch(e){ return bad("invalid json"); }
  const next = body.state;
  const err = validateState(next);
  if(err) return bad(err);

  // Preserve server-maintained fields if missing
  const cur = await readState();
  const merged = {
    ...cur,
    ...next,
    meta: { ...(cur.meta||{}), ...(next.meta||{}), importedAt: Date.now() }
  };

  await saveState(merged);
  return ok({ ok:true });
};
