const { json, loadState, saveState } = require('./_state');

// Privacy-friendly visit tracking.
// - Client sends a random local id (stored in localStorage).
// - We do NOT store IPs, names, or user agents.
// - Unique ids are stored per-day and trimmed automatically.

function trimOldDays(map, keepDays=14){
  try{
    const keys = Object.keys(map||{}).sort();
    if (keys.length <= keepDays) return map;
    const drop = keys.slice(0, Math.max(0, keys.length-keepDays));
    for (const k of drop) delete map[k];
  }catch(e){}
  return map;
}

exports.handler = async (event) => {
  try{
    if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
    const body = JSON.parse(event.body || '{}');
    const vid = String(body.vid || '').slice(0, 80);
    if (!vid) return json(400, { error: 'Missing vid' });

    const state = await loadState();
    state.metrics = state.metrics || { totalVisits:0, uniqueVisitIds:{}, playerLogins:0, uniquePlayerLogins:{} };
    state.metrics.totalVisits = (state.metrics.totalVisits || 0) + 1;

    const day = new Date().toISOString().slice(0,10);
    state.metrics.uniqueVisitIds = state.metrics.uniqueVisitIds || {};
    state.metrics.uniqueVisitIds[day] = state.metrics.uniqueVisitIds[day] || {};
    state.metrics.uniqueVisitIds[day][vid] = true;
    state.metrics.uniqueVisitIds = trimOldDays(state.metrics.uniqueVisitIds, 14);

    state.lastUpdated = new Date().toISOString();
    await saveState(state);

    return json(200, { ok:true });
  }catch(e){
    console.error('trackVisit failed:', e);
    return json(200, { ok:false }); // never break the app for metrics
  }
};
