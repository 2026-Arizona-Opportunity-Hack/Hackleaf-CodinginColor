'use client';
import { useCallback,useEffect,useRef,useState } from 'react';
import { allocateDonations } from './allocation';
import { assignPriorities } from './priority-planner';
import { useGivingWorkspace } from './giving-workspace';
export function useAIPriorities(enabled:boolean){
 const {giving,setGiving}=useGivingWorkspace(),latest=useRef(giving),controller=useRef<AbortController|null>(null),sequence=useRef(0);
 const [pending,setPending]=useState(false),[notice,setNotice]=useState(enabled?'AI will assign priorities to unfunded active requests.':'AI is off. New requests receive an unused priority; cards are sorted lowest number first.'),[assigned,setAssigned]=useState(false);
 useEffect(()=>{latest.current=giving;},[giving]);useEffect(()=>()=>controller.current?.abort(),[]);
 const rank=useCallback(async(snapshot:typeof giving,external?:AbortSignal)=>{if(!enabled)return;controller.current?.abort();const current=new AbortController(),id=++sequence.current;controller.current=current;setPending(true);setAssigned(false);
 try{const response=await fetch('/api/donation-requests/prioritize',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({giving:snapshot}),signal:external?AbortSignal.any([current.signal,external]):current.signal}),result=await response.json();if(!response.ok)throw new Error(result.error??'AI ranking failed.');if(id!==sequence.current)return;if(latest.current!==snapshot){setNotice('The queue changed while AI was ranking. Existing priorities are kept; refresh AI priorities to retry.');return;}
 if(result.mode==='ai'){const requests=assignPriorities(snapshot.requests,snapshot.allocations,result.order);setGiving({...snapshot,requests,allocations:allocateDonations(requests,snapshot.gifts,snapshot.allocations)});setAssigned(true);}setNotice(result.notice);
 }catch{if(id===sequence.current&&!current.signal.aborted&&!external?.aborted)setNotice('AI ranking is unavailable. Existing priorities are kept.');}finally{if(id===sequence.current)setPending(false);}},[enabled,setGiving]);
 useEffect(()=>{if(!enabled)return;const lifecycle=new AbortController();Promise.resolve().then(()=>{if(!lifecycle.signal.aborted)void rank(latest.current,lifecycle.signal);});return()=>lifecycle.abort();},[enabled,rank]);
 return {pending,notice,assigned,rank};
}
