import {it,expect,afterEach} from 'vitest';
import {cachedTerrain,clearTerrainCache} from '../terrainCache';
import {LEVEL1_DATA} from '@/config/levels/islandCircuit';
afterEach(clearTerrainCache);
it('reuses terrain buffers on return and evicts beyond two distinct maps',()=>{
 const make=(id:string)=>({...LEVEL1_DATA,id,terrainBase:{...LEVEL1_DATA.terrainBase,subdivisions:8}}),a=make('a'),b=make('b'),c=make('c');
 const first=cachedTerrain(a);expect(cachedTerrain(a)).toBe(first);const second=cachedTerrain(b);cachedTerrain(a);cachedTerrain(c);expect(cachedTerrain(a)).toBe(first);expect(cachedTerrain(b)).not.toBe(second);
});
