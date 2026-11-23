import { useRef, useMemo, useLayoutEffect, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  InstancedMesh,
  Color,
  MeshStandardMaterial,
  Frustum,
  Matrix4,
  Quaternion,
  Vector3,
  type BufferGeometry,
  type Material,
  type MeshDepthMaterial,
  type Texture,
  type IUniform,
} from 'three';
import {
  createTrunkGeometry,
  createPineFoliageGeometry,
  createBirchTrunkGeometry,
  createBirchFoliageGeometry,
  createDesertTrunkGeometry,
  createDesertFoliageGeometry,
} from './geometries';
import { createFoliageWindMaterial } from './materials';
import {createFoliageDepthMaterial} from './foliageShadow';
import type { PropItem } from './types';
import {createVegetationCullSphere,partitionVegetation} from './vegetationChunks';
import {useSettingsStore} from '@/store/settingsStore';

interface VegetationCullState { frustum:Frustum; matrix:Matrix4; position:Vector3; rotation:Quaternion; epoch:number; projectionScale:number; enabled:boolean; lastUpdate:number }

export interface VegetationInstancerProps {
  pineTrees: PropItem[];
  birchTrees: PropItem[];
  desertTrees: PropItem[];
  canShadow: boolean;
  isSnow: boolean;
  isDesert: boolean;
  pineBarkTexture: Texture;
  pineBranchTexture: Texture;
  pineBranchSnowTexture: Texture;
  birchBarkTexture: Texture;
  leafyBranchTexture: Texture;
  desertBarkTexture: Texture;
  desertAcaciaBranchTexture: Texture;
}

/**
 * High-performance GPU-instanced vegetation renderer (Nordic Pines, Broadleaf Birch, Desert Acacia)
 * featuring custom vertex wind displacement shaders and zero-GC matrix uploads.
 */
export function VegetationInstancer({
  pineTrees,
  birchTrees,
  desertTrees,
  canShadow,
  isSnow,
  isDesert,
  pineBarkTexture,
  pineBranchTexture,
  pineBranchSnowTexture,
  birchBarkTexture,
  leafyBranchTexture,
  desertBarkTexture,
  desertAcaciaBranchTexture,
}: VegetationInstancerProps) {
  const pineChunks=useMemo(()=>partitionVegetation(pineTrees),[pineTrees]);
  const birchChunks=useMemo(()=>partitionVegetation(birchTrees),[birchTrees]);
  const desertChunks=useMemo(()=>partitionVegetation(desertTrees),[desertTrees]);
  const shadowsEnabled=useSettingsStore(s=>s.shadowsEnabled);
  const culling=useRef<VegetationCullState>({frustum:new Frustum(),matrix:new Matrix4(),position:new Vector3(Infinity,0,0),rotation:new Quaternion(),epoch:0,projectionScale:0,enabled:false,lastUpdate:-Infinity});

  const foliageShaderUniformsRef = useRef<Record<string, IUniform>[]>([]);

  // Procedural Geometries with genuine bounding spheres
  const pineTrunkGeo = useMemo(() => {
    const geo = createTrunkGeometry();
    geo.computeBoundingSphere();
    return geo;
  }, []);

  const pineFoliageGeo = useMemo(() => {
    const geo = createPineFoliageGeometry();
    geo.computeBoundingSphere();
    return geo;
  }, []);

  const birchTrunkGeo = useMemo(() => {
    const geo = createBirchTrunkGeometry();
    geo.computeBoundingSphere();
    return geo;
  }, []);

  const birchFoliageGeo = useMemo(() => {
    const geo = createBirchFoliageGeometry();
    geo.computeBoundingSphere();
    return geo;
  }, []);

  const desertTrunkGeo = useMemo(() => {
    const geo = createDesertTrunkGeometry();
    geo.computeBoundingSphere();
    return geo;
  }, []);

  const desertFoliageGeo = useMemo(() => {
    const geo = createDesertFoliageGeometry();
    geo.computeBoundingSphere();
    return geo;
  }, []);

  // Materials
  const pineTrunkMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        map: pineBarkTexture,
        roughness: 0.92,
        metalness: 0.02,
        color: new Color(isSnow ? '#44342a' : '#5a3f2b'),
      }),
    [pineBarkTexture, isSnow],
  );

  const birchTrunkMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        map: birchBarkTexture,
        roughness: 0.94,
        metalness: 0.01,
        color: new Color('#ffffff'),
      }),
    [birchBarkTexture],
  );

  const desertTrunkMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        map: desertBarkTexture,
        roughness: 0.95,
        metalness: 0.02,
        color: new Color('#5a3e2b'),
      }),
    [desertBarkTexture],
  );

  const pineFoliageMaterial = useMemo(
    () =>
      createFoliageWindMaterial(
        isSnow ? pineBranchSnowTexture : pineBranchTexture,
        isSnow ? '#ffffff' : isDesert ? '#c5b783' : '#b9ccb0',
        false,
        (u) => foliageShaderUniformsRef.current.push(u),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pineBranchTexture, pineBranchSnowTexture, isDesert, isSnow],
  );

  const birchFoliageMaterial = useMemo(
    () =>
      createFoliageWindMaterial(
        isSnow ? pineBranchSnowTexture : leafyBranchTexture,
        isSnow ? '#ffffff' : '#bbceb0',
        true,
        (u) => foliageShaderUniformsRef.current.push(u),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [leafyBranchTexture, pineBranchSnowTexture, isSnow],
  );

  const desertFoliageMaterial = useMemo(
    () =>
      createFoliageWindMaterial(
        desertAcaciaBranchTexture,
        '#9e914c',
        true,
        (u) => foliageShaderUniformsRef.current.push(u),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [desertAcaciaBranchTexture],
  );

  const foliageDepthMaterials=useMemo(()=>[
    createFoliageDepthMaterial(isSnow?pineBranchSnowTexture:pineBranchTexture,false,u=>foliageShaderUniformsRef.current.push(u)),
    createFoliageDepthMaterial(isSnow?pineBranchSnowTexture:leafyBranchTexture,true,u=>foliageShaderUniformsRef.current.push(u)),
    createFoliageDepthMaterial(desertAcaciaBranchTexture,true,u=>foliageShaderUniformsRef.current.push(u)),
  ],[isSnow,pineBranchSnowTexture,pineBranchTexture,leafyBranchTexture,desertAcaciaBranchTexture]);
  useEffect(()=>()=>foliageDepthMaterials.forEach(material=>material.dispose()),[foliageDepthMaterials]);
  // Frame update for wind animation
  useFrame((state) => {
    const cull=culling.current;
    const enabled=!canShadow||!shadowsEnabled;
    const camera=state.camera;
    const elapsed=state.clock.elapsedTime;
    const rotationChange=1-Math.abs(cull.rotation.dot(camera.quaternion));
    const projectionChanged=cull.projectionScale!==camera.projectionMatrix.elements[0];
    const due=elapsed-cull.lastUpdate>=.125 || rotationChange>.045 || projectionChanged || cull.enabled!==enabled;
    if(due && (cull.enabled!==enabled || cull.position.distanceToSquared(camera.position)>4
      || 1-Math.abs(cull.rotation.dot(camera.quaternion))>.00015
      || projectionChanged)){
      // Only trees outside a padded camera frustum are removed. With shadows on,
      // retain off-screen casters instead of changing visible ground shadows.
      camera.updateMatrixWorld();
      cull.matrix.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);
      cull.frustum.setFromProjectionMatrix(cull.matrix);
      cull.position.copy(camera.position);cull.rotation.copy(camera.quaternion);
      cull.projectionScale=camera.projectionMatrix.elements[0];cull.enabled=enabled;cull.lastUpdate=elapsed;cull.epoch++;
    }
    const time = state.clock.elapsedTime;
    for (const uniforms of foliageShaderUniformsRef.current) {
      if (uniforms.u_time) uniforms.u_time.value = time;
    }
  });

  // Clean up GPU buffers and materials on unmount/track change to prevent VRAM accumulation
  useEffect(() => {
    return () => {
      pineTrunkGeo.dispose();
      pineFoliageGeo.dispose();
      birchTrunkGeo.dispose();
      birchFoliageGeo.dispose();
      desertTrunkGeo.dispose();
      desertFoliageGeo.dispose();

      pineTrunkMaterial.dispose();
      birchTrunkMaterial.dispose();
      desertTrunkMaterial.dispose();
      pineFoliageMaterial.dispose();
      birchFoliageMaterial.dispose();
      desertFoliageMaterial.dispose();
    };
  }, [
    pineTrunkGeo,
    pineFoliageGeo,
    birchTrunkGeo,
    birchFoliageGeo,
    desertTrunkGeo,
    desertFoliageGeo,
    pineTrunkMaterial,
    birchTrunkMaterial,
    desertTrunkMaterial,
    pineFoliageMaterial,
    birchFoliageMaterial,
    desertFoliageMaterial,
  ]);

  return <>
    {pineChunks.map(chunk=><VegetationCell key={`pine:${chunk.key}`} culling={culling} items={chunk.items} trunkGeometry={pineTrunkGeo} foliageGeometry={pineFoliageGeo} trunkMaterial={pineTrunkMaterial} foliageMaterial={pineFoliageMaterial} depthMaterial={foliageDepthMaterials[0]} canShadow={canShadow}/>)}
    {birchChunks.map(chunk=><VegetationCell key={`birch:${chunk.key}`} culling={culling} items={chunk.items} trunkGeometry={birchTrunkGeo} foliageGeometry={birchFoliageGeo} trunkMaterial={birchTrunkMaterial} foliageMaterial={birchFoliageMaterial} depthMaterial={foliageDepthMaterials[1]} canShadow={canShadow}/>)}
    {desertChunks.map(chunk=><VegetationCell key={`desert:${chunk.key}`} culling={culling} items={chunk.items} trunkGeometry={desertTrunkGeo} foliageGeometry={desertFoliageGeo} trunkMaterial={desertTrunkMaterial} foliageMaterial={desertFoliageMaterial} depthMaterial={foliageDepthMaterials[2]} canShadow={canShadow}/>)}
  </>;
}

interface VegetationCellProps {
  culling:React.RefObject<VegetationCullState>;
  items:PropItem[];
  trunkGeometry:BufferGeometry;
  foliageGeometry:BufferGeometry;
  trunkMaterial:MeshStandardMaterial;
  foliageMaterial:Material;
  depthMaterial:MeshDepthMaterial;
  canShadow:boolean;
}

/** Independent tight bounds let Three.js skip off-screen cells in color and shadow passes. */
function VegetationCell({culling,items,trunkGeometry,foliageGeometry,trunkMaterial,foliageMaterial,depthMaterial,canShadow}:VegetationCellProps){
  const trunk=useRef<InstancedMesh>(null),foliage=useRef<InstancedMesh>(null);
  const epoch=useRef(-1);
  const visible=useMemo(()=>new Uint8Array(items.length).fill(1),[items]);
  const bounds=useMemo(()=>{
    if(!trunkGeometry.boundingSphere)trunkGeometry.computeBoundingSphere();
    if(!foliageGeometry.boundingSphere)foliageGeometry.computeBoundingSphere();
    if(!trunkGeometry.boundingSphere||!foliageGeometry.boundingSphere)return [];
    return items.map(item=>createVegetationCullSphere(foliageGeometry.boundingSphere!,trunkGeometry.boundingSphere!,item.matrix));
  },[items,trunkGeometry,foliageGeometry]);
  useLayoutEffect(()=>{
    const upload=(mesh:InstancedMesh|null)=>{
      if(!mesh)return;
      let windPadding=0;
      for(let index=0;index<items.length;index++){
        const item=items[index];mesh.setMatrixAt(index,item.matrix);
        windPadding=Math.max(windPadding,Math.abs(item.scale[0]),Math.abs(item.scale[2]));
      }
      mesh.count=items.length;
      mesh.instanceMatrix.needsUpdate=true;
      mesh.computeBoundingSphere();
      // Wind moves leaves by at most .07 local units; account for instance scale at cell edges.
      if(mesh.boundingSphere)mesh.boundingSphere.radius+=windPadding*.08;
    };
    upload(trunk.current);upload(foliage.current);
  },[items,trunkGeometry,foliageGeometry]);
  useFrame(()=>{
    const cull=culling.current;
    const trunkMesh=trunk.current,foliageMesh=foliage.current;
    if(!trunkMesh||!foliageMesh||epoch.current===cull.epoch)return;
    epoch.current=cull.epoch;
    let changed=false;
    for(let i=0;i<items.length;i++){
      const show=(!cull.enabled||!bounds[i]||cull.frustum.intersectsSphere(bounds[i]))?1:0;
      if(visible[i]!==show){visible[i]=show;changed=true;}
    }
    if(!changed)return;
    let count=0;
    for(let i=0;i<items.length;i++){
      if(!visible[i])continue;
      trunkMesh.setMatrixAt(count,items[i].matrix);foliageMesh.setMatrixAt(count,items[i].matrix);count++;
    }
    trunkMesh.count=count;foliageMesh.count=count;
    trunkMesh.instanceMatrix.needsUpdate=true;foliageMesh.instanceMatrix.needsUpdate=true;
    // Original complete-cell bounds remain conservative after compaction.
  });
  useEffect(()=>{
    const trunkMesh=trunk.current,foliageMesh=foliage.current;
    return()=>{trunkMesh?.dispose();foliageMesh?.dispose();};
  },[items.length,trunkGeometry,foliageGeometry,trunkMaterial,foliageMaterial]);
  return <>
    <instancedMesh ref={trunk} args={[trunkGeometry,trunkMaterial,items.length]} dispose={null} castShadow={canShadow} receiveShadow={canShadow} renderOrder={1} frustumCulled/>
    <instancedMesh ref={foliage} args={[foliageGeometry,foliageMaterial,items.length]} dispose={null} customDepthMaterial={depthMaterial} castShadow={canShadow} receiveShadow={canShadow} renderOrder={2} frustumCulled/>
  </>;
}
