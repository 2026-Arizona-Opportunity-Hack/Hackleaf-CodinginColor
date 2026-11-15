import { it,expect } from 'vitest';
import { fundingData } from './funding-data';
import { demoOwnerScope } from './demo-access';
it('aggregates exact cents by recorded program without inventing spending',()=>{
  expect(fundingData([{programId:'School',amountCents:2001,receivedOn:'2026-11-01'},{programId:'School',amountCents:999,receivedOn:'2026-11-02'},{programId:'Camp',amountCents:1500,receivedOn:'2026-11-03'}])).toEqual([{label:'School',cents:3000},{label:'Camp',cents:1500}]);
  expect(fundingData([])).toEqual([]);expect(()=>fundingData([{programId:'x',amountCents:-1,receivedOn:''}])).toThrow();
});
it('distinguishes admin access, the fictional staff assignment and unassigned new staff',()=>{
  expect(demoOwnerScope({id:'a',role:'admin',email:'admin@hackleaf.demo'})).toBeNull();
  expect(demoOwnerScope({id:'s',role:'staff',email:'staff@hackleaf.demo'})).toBe('member-1');
  expect(demoOwnerScope({id:'new',role:'staff',email:'new@example.org'})).toBe('new');
});
