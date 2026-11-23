import { useEffect, useMemo } from 'react';
import { Color, Group, Mesh, MeshStandardMaterial, DoubleSide,RepeatWrapping,SRGBColorSpace,NoColorSpace } from 'three';
import {useTexture} from '@react-three/drei';
import {isMobileDevice} from '@/utils/device';
import { useTerrainData } from '@/components/terrain/TerrainContext';
import { createCourseRibbon } from '@/utils/courseRibbon';

/** Road paint follows the existing terrain's asphalt surface in four static draw calls. */
export function DistrictRoads(){
  const {levelData,heightmapData}=useTerrainData();
  const harbor=levelData.id==='level6_gymkhana_harbor';
  const [albedo,normal,roughness]=useTexture(['albedo','normal','roughness'].map(name=>
    harbor?`/textures/pbr/asphalt-${name}${isMobileDevice()?'-mobile':''}.webp`:'/textures/placeholder.png'),textures=>{
    if(!Array.isArray(textures))return;
    textures.forEach((texture,i)=>{texture.wrapS=texture.wrapT=RepeatWrapping;texture.colorSpace=i===0?SRGBColorSpace:NoColorSpace;});
  });
  const scene=useMemo(()=>{
    const group=new Group();if(!levelData.id.includes('gymkhana'))return group;
    if(harbor){
      const geometry=createCourseRibbon(levelData,heightmapData,0,levelData.track.width,720);
      const material=new MeshStandardMaterial({color:'#b9b8b2',map:albedo,normalMap:normal,roughnessMap:roughness,
        roughness:0.92,side:DoubleSide,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
      material.normalScale.set(.4,.4);
      const road=new Mesh(geometry,material);road.receiveShadow=true;group.add(road);
      // Painted blue-white shoulder strips frame the racing line without adding invisible collisions.
      for(const side of [-1,1]){
        const shoulder=createCourseRibbon(levelData,heightmapData,side*(levelData.track.width/2+.3),.6,720,false,.09);
        const paint=new MeshStandardMaterial({color:'#d9e7f2',roughness:.75,polygonOffset:true,polygonOffsetFactor:-3});
        paint.onBeforeCompile=shader=>{
          shader.vertexShader='varying vec2 vShoulderUv;\n'+shader.vertexShader;
          shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvShoulderUv=uv;');
          shader.fragmentShader='varying vec2 vShoulderUv;\n'+shader.fragmentShader;
          shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
            float stripe=mod(floor((vShoulderUv.x+vShoulderUv.y)*1.3),2.);
            diffuseColor.rgb*=mix(vec3(.09,.29,.72),vec3(1.),stripe);`);
        };
        paint.customProgramCacheKey=()=> 'aeroline-shoulder-stripes-v1';
        const mesh=new Mesh(shoulder,paint);mesh.receiveShadow=true;group.add(mesh);
      }
    }
    const definitions=[
      {offset:-levelData.track.width/2+0.4,width:0.18,color:'#f2f0df',asphalt:false,dashed:false},
      {offset:levelData.track.width/2-0.4,width:0.18,color:'#f2f0df',asphalt:false,dashed:false},
      {offset:-0.2,width:0.12,color:'#f4c76c',asphalt:false,dashed:true},
      {offset:0.2,width:0.12,color:'#f4c76c',asphalt:false,dashed:true},
    ];
    definitions.forEach((d,i)=>{
      // Distinct elevation prevents paint/asphalt coplanar shimmer at grazing angles.
      const geometry=createCourseRibbon(levelData,heightmapData,d.offset,d.width,720,d.dashed,0.085);
      const material=new MeshStandardMaterial({color:new Color(d.color),
        roughness:0.88,metalness:0,side:DoubleSide,polygonOffset:true,polygonOffsetFactor:-2-i,polygonOffsetUnits:-2-i});
      const mesh=new Mesh(geometry,material);mesh.receiveShadow=true;mesh.renderOrder=i+1;group.add(mesh);
    });
    return group;
  },[levelData,heightmapData,harbor,albedo,normal,roughness]);
  useEffect(()=>()=>{scene.traverse(object=>{if(object instanceof Mesh){object.geometry.dispose();if(object.material instanceof MeshStandardMaterial)object.material.dispose();}});},[scene]);
  return <primitive object={scene}/>;
}
