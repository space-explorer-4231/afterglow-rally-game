import {describe,expect,it,vi} from 'vitest';
import {CatmullRomCurve3,Vector3,InstancedMesh,Texture,MeshStandardMaterial} from 'three';
import {LEVEL_REGISTRY} from '@/config/levelRegistry';
import {planFestivalRoute,visitFestivalStops} from '../festivalRoute';
import {createFestivalScenery} from '../festivalScenery';

describe('festival scenery and exploration',()=>{
 it('owns and disposes PBR surfaces without mutating cached sources',()=>{
  const stops=planFestivalRoute(Object.values(LEVEL_REGISTRY)[0].data),sources=Array.from({length:9},()=>new Texture()),spies=sources.map(t=>vi.spyOn(t,'dispose'));
  const resources=createFestivalScenery(stops,[1,2,3],true,sources,[2,3,4]),disposals:ReturnType<typeof vi.spyOn>[]=[];
  resources.group.traverse(o=>{if(o instanceof InstancedMesh&&o.material instanceof MeshStandardMaterial){disposals.push(vi.spyOn(o.material,'dispose'));if(o.material.map)expect(o.geometry.getAttribute('urbanDimensions').count).toBe(o.count);}});
  resources.dispose();resources.dispose();disposals.forEach(spy=>expect(spy).toHaveBeenCalledOnce());spies.forEach(spy=>expect(spy).not.toHaveBeenCalled());sources.forEach(t=>t.dispose());
  expect(()=>createFestivalScenery(stops,[],false)).toThrow();expect(()=>createFestivalScenery(stops,[1,2,3],false,[],[1,NaN,1])).toThrow();
 });
 for(const level of Object.values(LEVEL_REGISTRY))it(level.id+' has discoverable, clear landmarks',()=>{
  const stops=planFestivalRoute(level.data);expect(stops).toHaveLength(3);expect(planFestivalRoute(level.data)).toEqual(stops);
  const curve=new CatmullRomCurve3(level.data.track.points.map(p=>new Vector3(p.x,0,p.z)),true,'catmullrom',.5),route=curve.getSpacedPoints(1500);
  let mask=0;
  for(const stop of stops){
   expect(Math.min(...route.map(p=>Math.hypot(p.x-stop.x,p.z-stop.z)))).toBeGreaterThan(level.data.track.width/2+11);
   mask=visitFestivalStops(stops,mask,stop.roadX,stop.roadZ);
  }
  expect(mask).toBe(7);expect(visitFestivalStops(stops,mask,NaN,Infinity)).toBe(mask);
  const resources=createFestivalScenery(stops,[1,2,3],false);let draws=0,triangles=0;
  resources.group.traverse(o=>{if(o instanceof InstancedMesh){draws++;triangles+=(o.geometry.index?.count??0)/3*o.count;}});
  expect(draws).toBeLessThanOrEqual(7);expect(triangles).toBeLessThan(10000);
  resources.dispose();resources.dispose();
 });
});
