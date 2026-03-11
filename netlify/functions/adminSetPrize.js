const { json, loadState, saveState, pushLog } = require("./_state");
const { isAdminAuthed } = require("./_adminGuard");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405,{error:"POST only"});
  const ok = await isAdminAuthed(event);
  if(!ok) return json(401,{error:"unauthorized"});

  let body = {};
  try{ body = JSON.parse(event.body || "{}"); }catch(e){ return json(400,{error:"bad json"}); }

  const mode = (body.mode || "set").toString(); // set | add | sub
  const amtRaw = body.amount;
  const deltaRaw = body.delta;
  const note = (body.note || "").toString().slice(0,140);

  const state = await loadState();
  if(!state.prize || typeof state.prize!=="object") state.prize = { amount:0, updatedAt:null, note:"", history:[] };
  if(!Array.isArray(state.prize.history)) state.prize.history = [];

  let amount = Number(state.prize.amount||0) || 0;

  if(mode === "set"){
    const next = Number(amtRaw);
    if(!Number.isFinite(next) || next < 0) return json(400,{error:"invalid amount"});
    amount = Math.round(next*100)/100;
    state.prize.note = note;
    state.prize.history.push({ ts: Date.now(), kind:"set", amount, note });
    pushLog(state, `Prize pool set to $${amount}${note?` (${note})`:""}`);
  } else if(mode === "add" || mode==="sub"){
    const d = Number(deltaRaw);
    if(!Number.isFinite(d) || d <= 0) return json(400,{error:"invalid delta"});
    const dd = Math.round(d*100)/100;
    amount = mode==="add" ? amount + dd : Math.max(0, amount - dd);
    state.prize.note = note;
    state.prize.history.push({ ts: Date.now(), kind:mode, delta: dd, amount, note });
    pushLog(state, `Prize pool ${mode==="add"?"+" : "-"}$${dd} → $${amount}${note?` (${note})`:""}`);
  } else {
    return json(400,{error:"invalid mode"});
  }

  state.prize.amount = amount;
  state.prize.updatedAt = Date.now();

  await saveState(state);
  return json(200,{ ok:true, prize: state.prize });
};
