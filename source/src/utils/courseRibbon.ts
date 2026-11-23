import { BufferGeometry, Float32BufferAttribute, CatmullRomCurve3, Vector3 } from 'three';
import type { LevelData } from '@/types/level';
import type { HeightmapData } from '@/types/terrain';
import { getInterpolatedHeight } from './terrainCompiler';

/** Build a terrain-conforming, closed ribbon offset from the driving line. */
export function createCourseRibbon(level: LevelData, terrain: HeightmapData, offset: number,
  width: number, samples = 720, dashed = false, surfaceLift = 0.032): BufferGeometry {
  const curve=new CatmullRomCurve3(level.track.points.map(p=>new Vector3(p.x,0,p.z)),true,'catmullrom',0.5);
  const positions:number[]=[];const uv:number[]=[];const indices:number[]=[];
  const point=new Vector3(),tangent=new Vector3();
  const half=width/2;
  for(let i=0;i<=samples;i++){
    curve.getPointAt(i/samples,point);curve.getTangentAt(i/samples,tangent);
    const nx=tangent.z,nz=-tangent.x;
    for(const side of [-half,half]){
      const x=point.x+nx*(offset+side),z=point.z+nz*(offset+side);
      const y=getInterpolatedHeight(x,z,terrain.heights,terrain.rows,terrain.cols,level.terrainBase.width,level.terrainBase.depth);
      positions.push(x,y+surfaceLift,z);uv.push(x/3,z/3);
    }
    if(i<samples && (!dashed || Math.floor(i/3)%2===0)){
      const b=i*2;indices.push(b,b+2,b+1,b+1,b+2,b+3);
    }
  }
  const geometry=new BufferGeometry();
  geometry.setAttribute('position',new Float32BufferAttribute(positions,3));
  geometry.setAttribute('uv',new Float32BufferAttribute(uv,2));
  geometry.setIndex(indices);geometry.computeVertexNormals();geometry.computeBoundingSphere();
  return geometry;
}
