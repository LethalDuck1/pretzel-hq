const {verifySession}=require("./_adminAuth");
async function isAdminAuthed(event,isAdminKeyFn){try{if(isAdminKeyFn&&isAdminKeyFn(event))return true;const h=event.headers||{};const t=h["x-admin-token"]||h["X-Admin-Token"]||"";if(!t)return false;const s=await verifySession(t);return !!s;}catch{return false;}}
module.exports={isAdminAuthed};