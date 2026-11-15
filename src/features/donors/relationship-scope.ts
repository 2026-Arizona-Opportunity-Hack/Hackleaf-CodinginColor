import type { Relationships } from '@/features/assistant/contracts';
export function scopeRelationships(data:Relationships,owner:string|null):Relationships {
  if(owner===null)return data;
  const donors=data.donors.filter(d=>d.ownerId===owner),ids=new Set(donors.map(d=>d.id));
  return {donors,gifts:data.gifts.filter(g=>ids.has(g.donorId)),tasks:data.tasks.filter(t=>ids.has(t.donorId)),communications:data.communications.filter(c=>ids.has(c.donorId)),drafts:data.drafts.filter(d=>ids.has(d.donorId))};
}
