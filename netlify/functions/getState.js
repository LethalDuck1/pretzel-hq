const { loadState, json } = require("./_state");

exports.handler = async () => {
  try{
    const state = await loadState();
    return json(200, state);
  }catch(e){
    // Helpful for debugging in Netlify function logs
    console.error("getState failed:", e);
    return json(500, { error: "Failed to read state", detail: e && e.message ? e.message : "unknown" });
  }
};
