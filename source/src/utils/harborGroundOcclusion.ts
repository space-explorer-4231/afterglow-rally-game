import {Group,InstancedMesh,InstancedBufferAttribute,Object3D,PlaneGeometry,ShaderMaterial} from 'three';
import {HARBOR_BUILDINGS,HARBOR_PARKING} from '@/config/harborScenery';
import {createCoastalPlacements} from '@/config/coastalAssets';
import {partitionSpatialInstances} from './spatialInstances';

/** Static ground-space occlusion footprint; feather and size are in metres. */
export interface GroundOcclusionFootprint{x:number;y:number;z:number;w:number;d:number;feather:number;strength:number}

/** Contact grounding preserves height even when the laptop profile disables shadow maps. */
export function harborGroundFootprints(heights:readonly number[]):GroundOcclusionFootprint[]{
  if(heights.length!==HARBOR_BUILDINGS.length||heights.some(n=>!Number.isFinite(n)))throw new Error('Invalid Harbor contact elevations.');
  const parts:GroundOcclusionFootprint[]=HARBOR_BUILDINGS.map((b,i)=>({x:b.x,y:heights[i]+.216,z:b.z,w:b.width+.2,d:b.depth+.2,feather:1.75,strength:.26}));
  for(const p of createCoastalPlacements())if(p.asset==='island_tree_02')
    parts.push({x:p.x,y:8.268,z:p.z,w:.55,d:.55,feather:1.1,strength:.23});
  for(const p of HARBOR_PARKING)parts.push({x:p.x,y:8.311,z:p.z,w:1.72,d:3.6,feather:.55,strength:.30});
  return parts;
}

/** Bounded instanced analytic occlusion; no shadow render target, texture or per-frame work. */
export function createGroundOcclusionResources(parts:readonly GroundOcclusionFootprint[],strengthScale=1){
  if(!Number.isFinite(strengthScale)||strengthScale<0||parts.some(p=>
    ![p.x,p.y,p.z,p.w,p.d,p.feather,p.strength].every(Number.isFinite)||p.w<=0||p.d<=0||p.feather<=0||p.strength<0||p.strength>1))
    throw new Error('Invalid ground occlusion footprint.');
  const group=new Group(),dummy=new Object3D();
  const material=new ShaderMaterial({transparent:true,depthWrite:false,toneMapped:true,
    vertexShader:`attribute vec4 groundParams;
      varying vec2 vLocalMetres; varying vec4 vGroundParams;
      void main(){vGroundParams=groundParams;
        vLocalMetres=(uv-.5)*(groundParams.xy+2.*groundParams.z);
        gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.);}`,
    fragmentShader:`varying vec2 vLocalMetres; varying vec4 vGroundParams;
      void main(){vec2 q=abs(vLocalMetres)-vGroundParams.xy*.5;
        float d=length(max(q,0.))+min(max(q.x,q.y),0.);
        float alpha=vGroundParams.w*(1.-smoothstep(-.05,vGroundParams.z,d));
        if(alpha<.004)discard;
        gl_FragColor=vec4(.013,.022,.029,alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`});
  for(const cell of partitionSpatialInstances(parts,90)){
    const geometry=new PlaneGeometry(1,1);geometry.rotateX(-Math.PI/2);
    geometry.setAttribute('groundParams',new InstancedBufferAttribute(new Float32Array(cell.flatMap(p=>[p.w,p.d,p.feather,p.strength*strengthScale])),4));
    const mesh=new InstancedMesh(geometry,material,cell.length);
    cell.forEach((p,i)=>{dummy.position.set(p.x,p.y,p.z);dummy.scale.set(p.w+2*p.feather,1,p.d+2*p.feather);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});
    mesh.renderOrder=1;mesh.computeBoundingSphere();group.add(mesh);
  }
  let disposed=false;
  return {group,material,dispose:()=>{if(disposed)return;disposed=true;
    group.traverse(object=>{if(object instanceof InstancedMesh){object.geometry.dispose();object.dispose();}});material.dispose();}};
}
