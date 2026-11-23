import {BoxGeometry,Group,InstancedMesh,MeshStandardMaterial,Object3D,SRGBColorSpace,type Texture,type Camera} from 'three';
import type {GraphicsQuality} from '@/types/game';
import {configureUrbanGeometry,configureUrbanSurface} from '@/components/environment/urbanMaterial';
import {configureUrbanGlass} from '@/components/environment/urbanGlass';
import {partitionSpatialInstances} from '@/utils/spatialInstances';
import type {HarborFinish,HarborPart} from './harborArchitecture';
import {createHarborVisibilityController,type HarborVisibilityBatch} from './harborVisibility';

const FINISHES:readonly HarborFinish[]=['stucco','terracotta','ochre','sage','brick','cladding','paving','glass','stone','metal','blue','light','grass','asphalt','paint','sign'];
const COLORS:Record<HarborFinish,string>={stucco:'#f4e7d2',terracotta:'#b77e65',ochre:'#bca77e',sage:'#87998a',brick:'#b69e89',cladding:'#b3c2c0',paving:'#e4dccb',glass:'#a0c3cf',stone:'#d5cbb7',metal:'#708079',blue:'#326e69',light:'#ffe9c5',grass:'#ffffff',asphalt:'#39444a',paint:'#e1e3db',sign:'#ffffff'};
const TEXTURE_INDEX:Partial<Record<HarborFinish,number>>={stucco:0,terracotta:0,ochre:0,sage:0,brick:1,cladding:2,paving:3,grass:4};

/** Shared material batches with camera-filtered instances and explicit ownership. */
export interface HarborRenderResources{
  group:Group;materials:MeshStandardMaterial[];textures:Texture[];updateVisibility:(camera:Camera,elapsedSeconds:number)=>void;dispose:()=>void;
}
/** Allocate street architecture once, retaining material and collider appearance. */
export function createHarborRenderResources(parts:readonly HarborPart[],urban:readonly Texture[],signTexture:Texture,
  quality:GraphicsQuality,mobile:boolean,shadows:boolean,asphalt:readonly Texture[]=[]):HarborRenderResources{
  if(urban.length!==15)throw new Error('Harbor requires five complete PBR surface sets.');
  const group=new Group(),materials:MeshStandardMaterial[]=[],textures:Texture[]=[];
  const dummy=new Object3D();
  const visibilityBatches:HarborVisibilityBatch[]=[];
  for(const finish of FINISHES){
    const matching=parts.filter(p=>p.finish===finish);
    // Shadow passes need off-screen casters; keep spatial cells in that mode.
    const cells=shadows&&!mobile?partitionSpatialInstances(matching,75):matching.length?[matching]:[];
    if(!cells.length)continue;
    const material=new MeshStandardMaterial({color:COLORS[finish],roughness:finish==='metal'?.45:.85,metalness:finish==='metal'?.65:0});
    materials.push(material);
    const textureIndex=TEXTURE_INDEX[finish];
    if(textureIndex!==undefined)textures.push(...configureUrbanSurface(material,urban.slice(textureIndex*3,textureIndex*3+3),
      quality==='high'||quality==='very_high'?4:2,finish==='grass'?4:2));
    if(finish==='asphalt'&&asphalt.length===3){
      material.color.set('#b9b8b2');material.roughness=.92;
      textures.push(...configureUrbanSurface(material,asphalt,mobile?2:4,3));
    }
    if(finish==='glass'){material.roughness=.17;material.metalness=.35;material.envMapIntensity=1.15;configureUrbanGlass(material);}
    if(finish==='blue'){material.roughness=.34;material.metalness=.18;}
    if(finish==='light'){material.emissive.set(COLORS.light);material.emissiveIntensity=.65;}
    if(finish==='sign'){const map=signTexture.clone();map.colorSpace=SRGBColorSpace;map.needsUpdate=true;textures.push(map);material.map=map;}
    for(const cell of cells){
      const geometry=new BoxGeometry(1,1,1);
      if(textureIndex!==undefined||(finish==='asphalt'&&asphalt.length===3))configureUrbanGeometry(geometry,new Float32Array(cell.flatMap(p=>[p.w,p.h,p.d])));
      const mesh=new InstancedMesh(geometry,material,cell.length);
      cell.forEach((p,j)=>{dummy.position.set(p.x,p.y,p.z);dummy.scale.set(p.w,p.h,p.d);dummy.updateMatrix();mesh.setMatrixAt(j,dummy.matrix);});
      mesh.castShadow=!mobile&&shadows&&finish!=='light'&&finish!=='paint'&&finish!=='grass';
      mesh.receiveShadow=!mobile&&shadows;mesh.computeBoundingSphere();group.add(mesh);
      if(!shadows||mobile)visibilityBatches.push({mesh,parts:cell});
    }
  }
  let disposed=false;
  const visibility=createHarborVisibilityController(visibilityBatches);
  return {group,materials,textures,updateVisibility:visibility.update,dispose:()=>{
    if(disposed)return;disposed=true;
    group.traverse(object=>{if(object instanceof InstancedMesh){object.geometry.dispose();object.dispose();}});
    materials.forEach(material=>material.dispose());textures.forEach(texture=>texture.dispose());
  }};
}
