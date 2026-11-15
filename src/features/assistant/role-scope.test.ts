import { it,expect,vi } from 'vitest';
const mock=vi.hoisted(()=>({user:{id:'staff-user',email:'staff@hackleaf.demo',role:'staff'} as {id:string;email:string;role:string}|null}));
vi.mock('server-only',()=>({}));
vi.mock('@/features/demo-auth/session',()=>({getDemoUser:async()=>mock.user}));
vi.mock('@/lib/workspace',()=>({isDemoWorkspace:()=>true}));
import { createContext } from './server-context';
import { initialRelationships } from './demo-state';
import { canUse } from './policy';
it('uses the signed-in demo role and scopes assistant relationships and history',async()=>{
  const snapshot={relationships:initialRelationships(),giving:{requests:[],gifts:[],allocations:[]},profile:null};
  const context=await createContext(new Request('http://localhost'),'/donors',snapshot,'test-session'),data=await context.data();
  expect(context.actor.role).toBe('board_member');expect(canUse(context.actor,'assign_owner')).toBe(false);
  expect(data.donors).toHaveLength(4);expect(data.donors.every(d=>d.ownerId==='member-1')).toBe(true);
  expect(data.gifts.every(g=>data.donors.some(d=>d.id===g.donorId))).toBe(true);
  mock.user={id:'admin',email:'admin@hackleaf.demo',role:'admin'};
  expect((await (await createContext(new Request('http://localhost'),'/donors',snapshot,'test-session')).data()).donors).toHaveLength(12);
  mock.user=null;await expect(createContext(new Request('http://localhost'),'/donors',snapshot,'test-session')).rejects.toThrow('Sign in');
});
