const { json, loadState, saveState, isAdmin } = require('./_state');
const { isAdminAuthed } = require('./_adminGuard');

exports.handler = async (event) => {
  try{
    if(!(await isAdminAuthed(event,isAdmin))) return json(401,{error:'Unauthorized'});
    if(event.httpMethod !== 'POST') return json(405,{error:'Method not allowed'});

    const body = JSON.parse(event.body||'{}');
    const playerId = String(body.playerId||'');
    const targetId = String(body.targetId||'');
    if(!playerId || !targetId) return json(400,{error:'Missing playerId/targetId'});

    const state = await loadState();
    state.targets = state.targets || {};
    state.targets[playerId] = { targetId, ts: new Date().toISOString() };
    state.lastUpdated = new Date().toISOString();
    await saveState(state);

    return json(200,{ok:true});
  }catch(e){
    console.error('adminSetTarget failed:', e);
    return json(500,{error:'Failed', detail: e?.message || 'unknown'});
  }
};
