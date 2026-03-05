const { json, loadState, saveState, isAdmin } = require('./_state');
const { isAdminAuthed } = require('./_adminGuard');

exports.handler = async (event) => {
  try{
    if(!(await isAdminAuthed(event,isAdmin))) return json(401,{error:'Unauthorized'});
    if(event.httpMethod !== 'POST') return json(405,{error:'Method not allowed'});
    const body = JSON.parse(event.body||'{}');
    const playerId = String(body.playerId||'');
    if(!playerId) return json(400,{error:'Missing playerId'});

    const state = await loadState();
    state.targets = state.targets || {};
    delete state.targets[playerId];
    state.lastUpdated = new Date().toISOString();
    await saveState(state);

    return json(200,{ok:true});
  }catch(e){
    console.error('adminClearTarget failed:', e);
    return json(500,{error:'Failed', detail: e?.message || 'unknown'});
  }
};
