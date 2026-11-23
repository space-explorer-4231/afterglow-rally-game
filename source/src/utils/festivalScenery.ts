import {BoxGeometry,CylinderGeometry,Group,InstancedMesh,MeshStandardMaterial,Object3D,type Texture} from 'three';
import type {FestivalStop} from './festivalRoute';
import {configureUrbanGeometry,configureUrbanSurface} from '@/components/environment/urbanMaterial';

interface Part{x:number;y:number;z:number;w:number;h:number;d:number;yaw:number;finish:number}
/** Allocate batched architectural detail once, with owned materials/geometries and explicit cleanup. */
export function createFestivalScenery(stops:readonly FestivalStop[],heights:readonly number[],snow:boolean,sources:readonly Texture[]=[],foundationDepths:readonly number[]=[]){
  if(heights.length!==stops.length||heights.some(y=>!Number.isFinite(y))||stops.some(s=>![s.x,s.z,s.yaw].every(Number.isFinite)))throw Error('Festival landmarks need finite matching elevations.');
  if(foundationDepths.length&&(foundationDepths.length!==stops.length||foundationDepths.some(d=>!Number.isFinite(d)||d<=0)))throw Error('Festival foundation depths must be finite and positive.');
  const group=new Group(),parts:Part[]=[],dummy=new Object3D();
  const materials=[new MeshStandardMaterial({color:snow?'#e6e6de':'#d4c6af',roughness:.88}),
    new MeshStandardMaterial({color:'#6b5544',roughness:.74}),new MeshStandardMaterial({color:'#e5eee7',metalness:.3,roughness:.36}),
    new MeshStandardMaterial({color:'#285c60',metalness:.48,roughness:.24}),new MeshStandardMaterial({color:'#f3ad5d',emissive:'#c47325',emissiveIntensity:.28,roughness:.5}),
    new MeshStandardMaterial({color:snow?'#b3c3bb':'#417c60',roughness:.93})];
  for(let i=0;i<stops.length;i++){
    const s=stops[i],ground=heights[i],c=Math.cos(s.yaw),n=Math.sin(s.yaw);
    const add=(x:number,y:number,z:number,w:number,h:number,d:number,finish:number)=>parts.push({x:s.x+x*c+z*n,y:ground+y,z:s.z-x*n+z*c,w,h,d,yaw:s.yaw,finish});
    add(0,.2,0,11,.4,8,0);
    const foundation=Math.max(.5,foundationDepths[i]??.5);
    for(const x of [-4.5,4.5])for(const z of [-2.8,2.8])add(x,-foundation/2,z,.6,foundation,.6,0);
    for(let x=-5;x<=5;x+=.5)add(x,.43,0,.38,.08,7.6,1);
    for(const x of [-4.5,4.5])for(const z of [-2.8,2.8])add(x,2.8,z,.22,4.8,.22,2);
    // Layered cantilever roof, solar-cell battens and warm downlight strips.
    add(0,5.15,0,12,.22,9,2);add(0,5.3,0,11.5,.08,8.5,3);
    for(let x=-5.3;x<=5.4;x+=.6)add(x,5.37,0,.035,.035,8.5,2);
    for(let z=-3.8;z<=4;z+=1)add(0,5.38,z,11.5,.035,.035,2);
    for(const x of [-4.3,4.3]){add(x,4.98,0,.1,.08,7,4);add(x,.95,-1.5,.55,.12,3,1);add(x,.7,-1.5,.16,.5,2.4,2);}
    // Raised planted beds with layered shrub crowns, leaving the lookout open.
    for(const x of [-4.5,4.5]){add(x,.72,2.7,1.2,.6,1.5,0);add(x,1.15,2.7,1.05,.45,1.3,5);add(x,1.4,2.7,.7,.3,.9,5);}
    add(-5,2.1,3.8,.2,3.4,.2,2);add(-5,3.5,3.8,.65,1.3,.16,4);
    // Short approach steps and safety edges are visible physical structures.
    add(0,.1,4.5,3,.2,1.2,0);
    add(0,.35,-3.85,10,.2,.12,4);
  }
  const geometries:BoxGeometry[]=[],textures:Texture[]=[];
  for(let finish=0;finish<materials.length;finish++){
    const batch=parts.filter(p=>p.finish===finish);if(!batch.length)continue;
    const geometry=new BoxGeometry(1,1,1);geometries.push(geometry);
    if(sources.length===9&&(finish===0||finish===1||finish===5)){
      const set=finish===0?0:finish===1?1:2;
      configureUrbanGeometry(geometry,new Float32Array(batch.flatMap(p=>[p.w,p.h,p.d])));
      textures.push(...configureUrbanSurface(materials[finish],sources.slice(set*3,set*3+3),2,finish===1?1:2));
    }
    const mesh=new InstancedMesh(geometry,materials[finish],batch.length);
    batch.forEach((p,i)=>{dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(0,p.yaw,0);dummy.scale.set(p.w,p.h,p.d);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});
    mesh.receiveShadow=true;mesh.computeBoundingSphere();group.add(mesh);
  }
  const beaconGeometry=new CylinderGeometry(.13,.18,5.5,10),beaconMaterial=new MeshStandardMaterial({color:'#f5c45c',emissive:'#d87519',emissiveIntensity:.5,metalness:.2,roughness:.4});
  const beacons=new InstancedMesh(beaconGeometry,beaconMaterial,stops.length);
  stops.forEach((s,i)=>{dummy.position.set(s.x,heights[i]+8.1,s.z);dummy.rotation.set(0,0,0);dummy.scale.set(1,1,1);dummy.updateMatrix();beacons.setMatrixAt(i,dummy.matrix);});beacons.computeBoundingSphere();group.add(beacons);
  let disposed=false;
  return {group,dispose:()=>{if(disposed)return;disposed=true;group.traverse(o=>{if(o instanceof InstancedMesh)o.dispose();});geometries.forEach(g=>g.dispose());textures.forEach(t=>t.dispose());beaconGeometry.dispose();beaconMaterial.dispose();materials.forEach(m=>m.dispose());}};
}
