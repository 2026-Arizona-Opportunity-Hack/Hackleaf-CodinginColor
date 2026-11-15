// Only the documented Staff demo account simulates Morgan's fictional donors.
// Newly registered staff start without assigned donor relationships.
export function demoOwnerScope(user:{id:string;role:string;email:string}|null) {
  if(user?.role==='admin')return null;
  return user?.email==='staff@hackleaf.demo'?'member-1':user?.id??'signed-out';
}
