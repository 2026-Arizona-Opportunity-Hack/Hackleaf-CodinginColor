export interface FundingGift { programId:string; amountCents:number; receivedOn:string }
export function fundingData(gifts:FundingGift[]) {
  const programs=new Map<string,number>();let total=0;
  for(const gift of gifts) {
    if(!Number.isSafeInteger(gift.amountCents)||gift.amountCents<0)throw new Error('Invalid gift amount.');
    total+=gift.amountCents;if(!Number.isSafeInteger(total))throw new Error('Funding total is too large.');
    const next=(programs.get(gift.programId)??0)+gift.amountCents;
    if(!Number.isSafeInteger(next))throw new Error('Funding total is too large.');
    programs.set(gift.programId,next);
  }
  return [...programs].map(([label,cents])=>({label,cents})).sort((a,b)=>b.cents-a.cents||a.label.localeCompare(b.label));
}
