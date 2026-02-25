const { loadState, json } = require("./_state");

exports.handler = async () => {
  try{
    const state = await loadState();
    return json(200, state);
  }catch{
    return json(500, { error: "Failed to read state" });
  }
};
