import {beforeEach,it,expect} from 'vitest';
import {useBoostHuntStore,HUNT_SECONDS} from '../boostHuntStore';
beforeEach(()=>useBoostHuntStore.getState().stop());
function time(seconds:number){for(let i=0;i<seconds*10;i++)useBoostHuntStore.getState().tick(.1);}
it('starts a fresh 90 second run with no score carried over',()=>{const s=useBoostHuntStore.getState();s.start(5);time(1);s.collect();s.start(10);expect(useBoostHuntStore.getState()).toMatchObject({active:true,target:10,remaining:HUNT_SECONDS,score:0,collected:0,combo:1});});
it('awards ordered rings, combos and bounded NOS rewards without duplicate farming',()=>{const s=useBoostHuntStore.getState();s.start(0);for(let i=1;i<=5;i++){time(1);expect(s.collect()).toBe(i===5?1:.35);expect(s.collect()).toBe(0);}expect(useBoostHuntStore.getState()).toMatchObject({target:5,collected:5,combo:5,score:1500});});
it('drops the combo after eight seconds and ends at zero without post-finish rewards',()=>{const s=useBoostHuntStore.getState();s.start(0);time(1);s.collect();time(9);s.collect();expect(useBoostHuntStore.getState().combo).toBe(1);time(100);expect(useBoostHuntStore.getState()).toMatchObject({active:false,finished:true,remaining:0});expect(s.collect()).toBe(0);});
it('ignores invalid clock values and does not charge a tab suspension as play time',()=>{const s=useBoostHuntStore.getState();s.start(0);for(const dt of [-1,0,NaN,Infinity])s.tick(dt);expect(useBoostHuntStore.getState().remaining).toBe(90);s.tick(30);expect(useBoostHuntStore.getState().remaining).toBe(89.8);});
