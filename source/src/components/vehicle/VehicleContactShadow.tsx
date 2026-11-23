import { useEffect, useMemo, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import type { RapierRigidBody } from '@react-three/rapier';
import { DataTexture, Group, Mesh, MeshBasicMaterial, PlaneGeometry, RGBAFormat, Quaternion, Vector3 } from 'three';
import { useTerrainData } from '@/components/terrain/TerrainContext';
import { getInterpolatedHeight } from '@/utils/terrainCompiler';
import { useSettingsStore } from '@/store/settingsStore';

/** Cheap soft contact shadow for profiles that disable real-time shadow maps. */
export function VehicleContactShadow({bodyRef}: {bodyRef: RefObject<RapierRigidBody | null>}) {
  const {heightmapData,levelData}=useTerrainData();
  const shadows=useSettingsStore(s=>s.shadowsEnabled);
  const resources=useMemo(()=>{
    const pixels=new Uint8Array(64*64*4);
    for(let y=0;y<64;y++)for(let x=0;x<64;x++){
      const r=((x-31.5)/26)**2+((y-31.5)/26)**2;
      pixels[(y*64+x)*4+3]=Math.round(255*Math.exp(-r*2.8)*Math.max(0,1-r/2));
    }
    const texture=new DataTexture(pixels,64,64,RGBAFormat);texture.needsUpdate=true;
    const geometry=new PlaneGeometry(3.4,5.7);
    const material=new MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,opacity:0.55,toneMapped:false,polygonOffset:true,polygonOffsetFactor:-1});
    const mesh=new Mesh(geometry,material);mesh.rotation.x=-Math.PI/2;
    const group=new Group();group.add(mesh);
    return {texture,geometry,material,group,rotation:new Quaternion(),forward:new Vector3()};
  },[]);
  useEffect(()=>()=>{resources.texture.dispose();resources.geometry.dispose();resources.material.dispose();},[resources]);
  useFrame(()=>{
    const body=bodyRef.current;
    if(!body || !body.isValid()) {resources.group.visible=false;return;}
    const p=body.translation();
    const h=getInterpolatedHeight(p.x,p.z,heightmapData.heights,heightmapData.rows,heightmapData.cols,levelData.terrainBase.width,levelData.terrainBase.depth);
    const gap=Math.max(0,p.y-h-0.60);
    resources.group.visible=!shadows && gap<3;
    resources.material.opacity=0.55*Math.max(0,1-gap/3);
    resources.group.position.set(p.x,h+0.04,p.z);
    const q=body.rotation();resources.rotation.set(q.x,q.y,q.z,q.w);
    resources.forward.set(0,0,1).applyQuaternion(resources.rotation);
    resources.group.rotation.y=Math.atan2(resources.forward.x,resources.forward.z);
  });
  return <primitive object={resources.group}/>;
}
