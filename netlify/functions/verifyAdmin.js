const { json, isAdmin } = require("./_state");

exports.handler = async (event) => {
  if(!isAdmin(event)) return json(401, { error: "Unauthorized" });
  return json(200, { ok: true });
};
