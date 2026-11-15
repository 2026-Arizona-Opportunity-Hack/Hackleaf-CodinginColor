import { it,expect,vi,beforeEach } from 'vitest';
const mock=vi.hoisted(()=>({role:'board_member',status:'authorized',queries:[] as {table:string;filters:[string,unknown][]}[]}));
vi.mock('server-only',()=>({}));
vi.mock('@/lib/supabase/member',()=>({getLiveStaff:async()=>({status:mock.status,user:{id:'staff-a'},member:{role:mock.role}})}));
vi.mock('@/lib/supabase/server',()=>({createSupabaseServerClient:async()=>({from:(table:string)=>{
  const call={table,filters:[] as [string,unknown][]};mock.queries.push(call);let single=false;
  const rows:Record<string,Record<string,unknown>[]>={donors:[{id:'a',name:'Owned A',kind:'individual',email:'a@example.org',owner_id:'staff-a'},{id:'b',name:'Private B',kind:'individual',email:'b@example.org',owner_id:'staff-b'}],members:[{id:'staff-a',display_name:'A'},{id:'staff-b',display_name:'B'}],gifts:[],communications:[]};
  const builder={select:()=>builder,order:()=>builder,eq:(key:string,value:unknown)=>{call.filters.push([key,value]);return builder;},in:(key:string,value:unknown[])=>{call.filters.push([key,value]);return builder;},single:()=>{single=true;return builder;},then:(resolve:(r:unknown)=>unknown)=>{
    const selected=(rows[table]??[]).filter(row=>call.filters.every(([key,value])=>Array.isArray(value)?value.includes(row[key]):row[key]===value));
    return Promise.resolve({data:single?selected[0]??null:selected,error:null}).then(resolve);
  }};return builder;
}})}));
import { fetchLiveDonors,fetchLiveDonor } from './donor-repository';
beforeEach(()=>{mock.role='board_member';mock.status='authorized';mock.queries=[];});
it('scopes list and direct profile queries before relying on installed database policies',async()=>{
  expect((await fetchLiveDonors())?.map(d=>d.id)).toEqual(['a']);
  expect(await fetchLiveDonor('b')).toBeNull();
  expect(mock.queries.filter(q=>q.table==='donors').every(q=>q.filters.some(([key,value])=>key==='owner_id'&&value==='staff-a'))).toBe(true);
  expect(await fetchLiveDonors(undefined,'staff-b')).toEqual([]);
});
it('allows admins all donors and fails closed without active access',async()=>{
  mock.role='admin';expect((await fetchLiveDonors())?.length).toBe(2);expect((await fetchLiveDonor('b'))?.name).toBe('Private B');
  mock.status='forbidden';mock.queries=[];expect(await fetchLiveDonors()).toBeNull();expect(await fetchLiveDonor('a')).toBeNull();expect(mock.queries).toEqual([]);
});
