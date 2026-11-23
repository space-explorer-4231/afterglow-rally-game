import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {lapGhostKey,loadLapGhost,saveLapGhost,clearLapGhosts} from '../lapGhostStorage';
import {appendLapGhost,createLapGhostRecorder,recordGhostSplit,finishLapGhost} from '../lapGhost';
const values=new Map<string,string>();
const key=(car='car')=>lapGhostKey('map',car,'asphalt','RWD','automatic',true,true,true);
function record(){const r=createLapGhostRecorder(3);for(let i=0;i<=40;i++)appendLapGhost(r,i/10,{x:0,y:1,z:i,qx:0,qy:0,qz:0,qw:1},true);recordGhostSplit(r,1,1);recordGhostSplit(r,2,2);recordGhostSplit(r,0,4);return finishLapGhost(r,4)!;}
beforeEach(()=>{values.clear();vi.stubGlobal('localStorage',{getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>values.set(k,v),removeItem:(k:string)=>values.delete(k),key:(i:number)=>Array.from(values.keys())[i]??null,get length(){return values.size;}});});
afterEach(()=>vi.unstubAllGlobals());
describe('bounded optional replay storage',()=>{
  it('saves and restores a setup record',()=>{expect(saveLapGhost(key(),record())).toBe(true);expect(loadLapGhost(key(),3)?.duration).toBe(4);});
  it('separates cars, tires, transmission and assist settings',()=>{
    const base=key();for(const other of [key('other'),lapGhostKey('map','car','snow','RWD','automatic',true,true,true),lapGhostKey('map','car','asphalt','AWD','manual',false,false,false)])expect(other).not.toBe(base);
  });
  it('evicts the oldest owned record after six setups',()=>{for(let i=0;i<8;i++)saveLapGhost(key('car'+i),record());expect(loadLapGhost(key('car0'),3)).toBeNull();expect(loadLapGhost(key('car1'),3)).toBeNull();expect(loadLapGhost(key('car7'),3)).not.toBeNull();expect(values.size).toBe(7);});
  it('refreshes an existing setup without evicting unrelated recent setups',()=>{for(let i=0;i<6;i++)saveLapGhost(key('car'+i),record());saveLapGhost(key('car0'),record());saveLapGhost(key('new'),record());expect(loadLapGhost(key('car0'),3)).not.toBeNull();expect(loadLapGhost(key('car1'),3)).toBeNull();});
  it('recovers from a corrupted catalog and ignores foreign entries',()=>{values.set('aeroline_ghost_124:index','{');expect(saveLapGhost(key(),record())).toBe(true);values.set('aeroline_ghost_124:index','["foreign"]');saveLapGhost(key('other'),record());expect(values.has('foreign')).toBe(false);});
  it('clears owned ghost records but preserves unrelated game progress',()=>{values.set('road_mastery','keep');saveLapGhost(key(),record());clearLapGhosts();expect(values.size).toBe(1);expect(values.get('road_mastery')).toBe('keep');});
  it('storage denial does not throw during gameplay',()=>{vi.stubGlobal('localStorage',{getItem:()=>{throw Error('disabled');},setItem:()=>{throw Error('quota');}});expect(loadLapGhost(key(),3)).toBeNull();expect(saveLapGhost(key(),record())).toBe(false);expect(()=>clearLapGhosts()).not.toThrow();});
});
