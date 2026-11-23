import { useEffect, useMemo, useLayoutEffect } from 'react';
import { BoxGeometry, Group, InstancedMesh, MeshStandardMaterial, Object3D, RepeatWrapping, SRGBColorSpace, NoColorSpace } from 'three';
import { useTexture } from '@react-three/drei';
import { CuboidCollider, RigidBody } from '@react-three/rapier';
import { useTerrainData } from '@/components/terrain/TerrainContext';
import { getInterpolatedHeight } from '@/utils/terrainCompiler';
import { useSettingsStore } from '@/store/settingsStore';
import { isMobileDevice } from '@/utils/device';
import { ARENA_DEPOTS, DEPOT_HALF_WIDTH, DEPOT_HALF_DEPTH } from '@/config/arenaScenery';

// Perimeter-only scenery leaves the launch grid, stunt ramps and drift circuit clear.
type BoxPart = { x: number; y: number; z: number; sx: number; sy: number; sz: number; yaw: number };

/** Nine instanced batches for an industrial pit district; no per-frame updates. */
export function DepotScenery() {
  const {heightmapData, levelData} = useTerrainData();
  const shadows = useSettingsStore(s=>s.shadowsEnabled);
  const isArena=levelData.id==='level5_gymkhana';
  const signTexture=useTexture(isArena?'/images/ui/pit-sign.svg':'/textures/placeholder.png');
  useLayoutEffect(()=>{signTexture.colorSpace=SRGBColorSpace;signTexture.needsUpdate=true;},[signTexture]);
  const [metalAlbedo,metalNormal,metalRoughness,metalMetalness]=useTexture(
    isArena ? ['/textures/pbr/metal-albedo.webp','/textures/pbr/metal-normal.webp','/textures/pbr/metal-roughness.webp','/textures/pbr/metal-metalness.webp'].map(p=>p.replace('.webp', isMobileDevice()?'-mobile.webp':'.webp')) : Array.from({length:4},()=>'/textures/placeholder.png'));
  useLayoutEffect(()=>{
    if(!isArena)return;
    for(const texture of [metalAlbedo,metalNormal,metalRoughness,metalMetalness]){
      texture.wrapS=texture.wrapT=RepeatWrapping;texture.repeat.set(6,2);texture.anisotropy=2;texture.colorSpace=NoColorSpace;texture.needsUpdate=true;
    }
    metalAlbedo.colorSpace=SRGBColorSpace;metalAlbedo.needsUpdate=true;
  },[isArena,metalAlbedo,metalNormal,metalRoughness,metalMetalness]);
  const placements = useMemo(() => ARENA_DEPOTS.map(([x,z,yaw])=>({x,z,yaw,
    y:getInterpolatedHeight(x,z,heightmapData.heights,heightmapData.rows,heightmapData.cols,levelData.terrainBase.width,levelData.terrainBase.depth)})), [heightmapData,levelData]);
  const scene = useMemo(() => {
    const group = new Group();
    if (!isArena) return group;
    const batches: BoxPart[][] = Array.from({length:9},()=>[]);
    for (const p of placements) {
      const add=(batch:number,x:number,y:number,z:number,sx:number,sy:number,sz:number)=>{
        batches[batch].push({x:p.x+x*Math.cos(p.yaw)+z*Math.sin(p.yaw),y:p.y+y,z:p.z+z*Math.cos(p.yaw)-x*Math.sin(p.yaw),sx,sy,sz,yaw:p.yaw});
      };
      add(0,0,4.5,0,38,9,22); // Steel shell
      add(1,0,9.25,0,40,0.5,24); // Roof and deep eaves
      add(8,0,9.1,11.38,17,3.2,0.18); // Branded workshop fascia
      add(8,0,9.1,-11.38,17,3.2,0.18);
      add(2,0,0.25,0,41,0.5,25); // Concrete plinth
      for (let x=-18;x<=18;x+=2) {
        add(1,x,4.8,-11.12,0.08,8,0.14); // Ribbed metal facade
        add(1,x,4.8,11.12,0.08,8,0.14);
      }
      for (const x of [-12,0,12]) {
        add(3,x,3.1,-11.16,8,6,0.16);
        for (let h=0.5;h<=5.8;h+=0.45) add(1,x,h,-11.27,8,0.045,0.10);
        add(4,x,7.8,-11.19,8.8,1.1,0.14);
        add(5,x,6.7,-11.6,1.5,0.15,0.5);
        add(3,x,10.2,0,3.5,1.5,3.5); // Rooftop ventilation housings
        add(3,x,3.1,11.16,8,6,0.16); // Roll-up garage bays
        for (let h=0.5;h<=5.8;h+=0.45) add(1,x,h,11.27,8,0.045,0.10);
        add(4,x,7.8,11.19,8.8,1.1,0.14); // Reflective clerestory glass
        add(5,x,6.7,11.6,1.5,0.15,0.5); // Warm work lights (emissive, no extra shadow maps)
      }
      for (const x of [-17,-7,7,17]) {
        add(6,x,0.7,15,0.28,1.4,0.28); // Protective bollards
        add(1,x,1.0,15,0.30,0.18,0.30);
      }
      for (let x=-18;x<=18;x+=6) add(7,x,0.022,28,0.12,0.035,14); // Parking bay paint
      add(7,0,0.022,21,36,0.035,0.12);
      add(1,-22,7,-4,0.30,14,0.30); // Pit floodlight mast
      add(5,-22,14,-4,3.5,0.30,1.1);
    }
    const colors=['#c8c1b2','#828c90','#a9a49b','#adb9bd','#21404b','#ffdeb2','#e5ac36','#dadac7','#ffffff'];
    const dummy=new Object3D();
    batches.forEach((parts,i)=>{
      const geometry=new BoxGeometry(1,1,1);
      const material=new MeshStandardMaterial({color:colors[i],roughness:i===4?0.12:i===1?0.48:0.82,metalness:i===4?0.75:i===1?0.55:0.05});
      if(i===0 || i===1 || i===3) {
        material.map=metalAlbedo;material.normalMap=metalNormal;material.normalScale.set(0.35,0.35);
        // Painted cladding has a dielectric coating; pure metal made shaded walls black.
        material.roughnessMap=metalRoughness;material.roughness=0.85;material.metalnessMap=metalMetalness;material.metalness=i===1?0.35:0.15;
      }
      if (i===5) {material.emissive.set('#ffd8a1');material.emissiveIntensity=0.7;}
      if (i===8) {material.map=signTexture;material.roughness=0.6;material.emissive.set('#ffffff');material.emissiveMap=signTexture;material.emissiveIntensity=0.15;}
      const mesh=new InstancedMesh(geometry,material,parts.length);
      parts.forEach((part,n)=>{
        dummy.position.set(part.x,part.y,part.z);dummy.rotation.set(0,part.yaw,0);dummy.scale.set(part.sx,part.sy,part.sz);dummy.updateMatrix();mesh.setMatrixAt(n,dummy.matrix);
      });
      mesh.castShadow=shadows && i!==5 && i!==7;mesh.receiveShadow=shadows;mesh.computeBoundingSphere();group.add(mesh);
    });
    return group;
  }, [placements,isArena,shadows,metalAlbedo,metalNormal,metalRoughness,metalMetalness,signTexture]);
  useEffect(()=>()=>{scene.traverse(object=>{if(object instanceof InstancedMesh){object.geometry.dispose();if(object.material instanceof MeshStandardMaterial)object.material.dispose();object.dispose();}});},[scene]);
  if (!isArena) return null;
  return <>
    <primitive object={scene} />
    {placements.map((p,i)=><RigidBody key={i} type="fixed" colliders={false} position={[p.x,p.y+4.5,p.z]} rotation={[0,p.yaw,0]}><CuboidCollider args={[DEPOT_HALF_WIDTH,4.5,DEPOT_HALF_DEPTH]} friction={0.4} restitution={0.05}/></RigidBody>)}
  </>;
}
