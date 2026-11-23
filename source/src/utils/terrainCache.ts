import type {LevelData} from '@/types/level';
import type {HeightmapData} from '@/types/terrain';
import {compileTerrain} from './terrainCompiler';
/** Reusing a title/garage map avoids recompiling the same terrain on Play. Bounded at two maps. */
const cache=new Map<LevelData,HeightmapData>();
export function cachedTerrain(level:LevelData):HeightmapData {
 const found=cache.get(level);if(found){cache.delete(level);cache.set(level,found);return found;}
 const result=compileTerrain(level);cache.set(level,result);
 if(cache.size>2){const oldest=cache.keys().next().value;if(oldest)cache.delete(oldest);}
 return result;
}
export function clearTerrainCache():void {cache.clear();}
