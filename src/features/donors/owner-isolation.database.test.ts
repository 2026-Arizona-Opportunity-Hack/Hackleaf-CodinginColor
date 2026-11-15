import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { beforeAll,afterAll,it,expect } from 'vitest';
const db=new PGlite();
const admin='10000000-0000-4000-8000-000000000001',a='10000000-0000-4000-8000-000000000002',b='10000000-0000-4000-8000-000000000003';
const donorA='20000000-0000-4000-8000-000000000001',donorB='20000000-0000-4000-8000-000000000002';
const migration=(name:string)=>readFileSync(new URL(`../../../supabase/migrations/${name}.sql`,import.meta.url),'utf8');
beforeAll(async()=>{
  await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;
    insert into auth.users values('${admin}'),('${a}'),('${b}');`);
  await db.exec(migration('202611140001_foundation'));
  await db.exec(migration('202611150001_members_admin_write'));
  await db.exec(migration('202611150002_donors_member_read'));
  await db.exec(`insert into public.members(id,display_name,role) values('${admin}','Admin','admin'),('${a}','Staff A','board_member'),('${b}','Staff B','board_member');
    insert into public.programs values('general','General');
    insert into public.donors(id,name,kind,owner_id) values('${donorA}','A donor','individual','${a}'),('${donorB}','B donor','individual','${b}');
    insert into public.gifts(donor_id,amount_cents,received_on,program_id,source,source_record_id) values('${donorA}',1000,current_date,'general','zeffy','A'),('${donorB}',2000,current_date,'general','zeffy','B');
    insert into public.communications(donor_id,actor_id,channel,summary,occurred_at,origin) values('${donorA}','${a}','email','Private A',now(),'manual_log'),('${donorB}','${b}','email','Private B',now(),'manual_log');`);
  await db.exec(migration('202611150003_exclusive_donor_relationships'));
},30000);
afterAll(async()=>{await db.close();});
async function asUser<T>(user:string,fn:()=>Promise<T>){await db.exec(`set role authenticated;select set_config('request.jwt.claim.sub','${user}',false);`);try{return await fn();}finally{await db.exec('reset role');}}
it('restores exclusive donor and related-history reads after the broad-read migration',async()=>{
  for(const [user,own,other] of [[a,donorA,donorB],[b,donorB,donorA]])await asUser(user,async()=>{
    expect((await db.query('select id from public.donors')).rows).toEqual([{id:own}]);
    expect((await db.query('select * from public.donors where id=$1',[other])).rows).toEqual([]);
    expect((await db.query('select donor_id from public.gifts')).rows).toEqual([{donor_id:own}]);
    expect((await db.query('select donor_id from public.communications')).rows).toEqual([{donor_id:own}]);
    await expect(db.query(`insert into public.communications(donor_id,actor_id,channel,summary,occurred_at,origin) values($1,$2,'email','Forbidden',now(),'manual_log')`,[other,user])).rejects.toThrow();
  });
});
it('lets admins read every relationship and lets staff create only their own',async()=>{
  await asUser(admin,async()=>expect((await db.query('select id from public.donors')).rows).toHaveLength(2));
  await asUser(a,async()=>{
    await db.query("insert into public.donors(name,kind,owner_id) values('New owned donor','individual',$1)",[a]);
    await expect(db.query("insert into public.donors(name,kind,owner_id) values('Wrong owner','individual',$1)",[b])).rejects.toThrow();
    await expect(db.query('update public.members set role=\'admin\' where id=$1 returning id',[a])).rejects.toThrow();
    expect((await db.query('delete from public.donors where id=$1 returning id',[donorA])).rows).toHaveLength(0);
  });
});
it('removes all donor access for inactive staff',async()=>{
  await db.query('update public.members set active=false where id=$1',[b]);
  await asUser(b,async()=>expect((await db.query('select id from public.donors')).rows).toHaveLength(0));
});
