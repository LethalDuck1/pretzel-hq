const { json, isAdmin, mkId, saveState, pushLog } = require("./_state");

exports.handler = async (event) => {
  try{
    if(!isAdmin(event)) return json(401, { error: "Unauthorized" });

    const teams = [
      { id: mkId("t"), name: "Pretzel Knights" },
      { id: mkId("t"), name: "Blue Twist" },
      { id: mkId("t"), name: "Orange Spiral" }
    ];

    const demoNames = ["Alex","Blake","Carter","Drew","Eli","Finn","Gabe","Hayden","Jace","Kai","Liam","Mason","Nolan","Owen","Parker"];
    const players = [];
    let i = 0;
    for(const t of teams){
      for(let k=0;k<5;k++){
        players.push({
          id: mkId("p"),
          name: demoNames[i++ % demoNames.length],
          teamId: t.id,
          status: "alive",
          kills: 0
        });
      }
    }

    const state = { lastUpdated: new Date().toISOString(), teams, players, log: [] };
    pushLog(state, "HQ seeded with demo data.");
    await saveState(state);

    return json(200, { ok:true });
  }catch{
    return json(500, { error:"Seed failed" });
  }
};
