import {useEffect,useMemo} from 'react';
import {useFrame} from '@react-three/fiber';
import {useGLTF,useTexture} from '@react-three/drei';
import {CuboidCollider,RigidBody} from '@react-three/rapier';
import {Frustum,Group,InstancedMesh,Matrix4,Mesh,MeshStandardMaterial,Object3D,PlaneGeometry,type BufferGeometry,type Material} from 'three';
import {COASTAL_ASSETS,createCoastalPlacements,coastalViewDistance,type CoastalAsset} from '@/config/coastalAssets';
import {partitionSpatialInstances} from '@/utils/spatialInstances';
import {useSettingsStore} from '@/store/settingsStore';
import {isMobileOrAndroid} from '@/utils/device';
import {versionedAsset} from '@/utils/versionedAsset';
import {createCoastalTreeImpostor} from './coastalTreeImpostor';
import {bakeStaticGeometry} from '@/utils/bakeStaticGeometry';
import {createInstanceFrustumCuller} from '@/utils/instanceFrustumCulling';

/** Static instanced assets retain embedded node transforms, texture channels and alpha cutouts. */
export function CoastalPhotogrammetry(){
  const mobile=isMobileOrAndroid();
  const quality=useSettingsStore(s=>s.graphicsQuality);
  const shadows=useSettingsStore(s=>s.shadowsEnabled);
  const suffix=mobile||quality==='low'?'-mobile':'';
  const assets=useGLTF(COASTAL_ASSETS.map(id=>versionedAsset(`/models/coastal/${id}${suffix}.glb`)));
  const treeAtlas=useTexture(versionedAsset('/textures/coastal/coastal-tree-atlas.webp'));
  const layout=useMemo(()=>createCoastalPlacements(),[]);
  const rendered=useMemo(()=>{
    const group=new Group();
    const cells:{group:Group;x:number;z:number;rangeSq:number;minimumSq:number}[]=[];
    const geometries:BufferGeometry[]=[];
    const materials:Material[]=[];
    const cullers:ReturnType<typeof createInstanceFrustumCuller>[]=[];
    const dummy=new Object3D();
    const impostor=createCoastalTreeImpostor(treeAtlas);
    const impostorGeometry=new PlaneGeometry(4.82276,4.82276);
    materials.push(impostor.material);geometries.push(impostorGeometry);
    COASTAL_ASSETS.forEach((asset:CoastalAsset,index)=>{
      const source=assets[index].scene;
      source.updateMatrixWorld(true);
      const placements=layout.filter(p=>p.asset===asset);
      const primitives:{geometry:BufferGeometry;material:Material|Material[]}[]=[];
      source.traverse(object=>{
        if(!(object instanceof Mesh))return;
        const geometry=bakeStaticGeometry(object.geometry,object.matrixWorld);geometries.push(geometry);
        const material=Array.isArray(object.material)?object.material.map(m=>m.clone()):object.material.clone();
        for(const m of Array.isArray(material)?material:[material]){
          materials.push(m);
          if(m instanceof MeshStandardMaterial)m.envMapIntensity=.75;
        }
        primitives.push({geometry,material});
      });
      for(const parts of partitionSpatialInstances(placements,45)){
        const cell=new Group();
        if(asset==='island_tree_02')cell.userData.reflectionNearFoliage=true;
        for(const {geometry,material} of primitives){
          const mesh=new InstancedMesh(geometry,material,parts.length);
          parts.forEach((p,j)=>{
            dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(0,p.yaw,0);dummy.scale.setScalar(p.scale);dummy.updateMatrix();mesh.setMatrixAt(j,dummy.matrix);
          });
          mesh.castShadow=!mobile&&shadows;mesh.receiveShadow=!mobile&&shadows;mesh.computeBoundingSphere();cell.add(mesh);
          cullers.push(createInstanceFrustumCuller(mesh));
        }
        const centerX=parts.reduce((n,p)=>n+p.x,0)/parts.length,centerZ=parts.reduce((n,p)=>n+p.z,0)/parts.length;
        const range=coastalViewDistance(quality,mobile,asset);
        cells.push({group:cell,x:centerX,z:centerZ,rangeSq:range*range,minimumSq:0});group.add(cell);
        if(asset==='island_tree_02'){
          const distant=new Group();
          distant.userData.reflectionFarFoliage=true;
          const mesh=new InstancedMesh(impostorGeometry,impostor.material,parts.length);
          parts.forEach((p,j)=>{dummy.position.set(p.x,p.y+1.704452*p.scale,p.z);dummy.rotation.set(0,p.yaw,0);dummy.scale.setScalar(p.scale);dummy.updateMatrix();mesh.setMatrixAt(j,dummy.matrix);});
          mesh.computeBoundingSphere();distant.add(mesh);group.add(distant);
          cells.push({group:distant,x:centerX,z:centerZ,rangeSq:350*350,minimumSq:range*range});
        }
      }
    });
    return {group,cells,geometries,materials,cullers,frustum:new Frustum(),projection:new Matrix4(),impostorTexture:impostor.texture,nextUpdate:0};
  },[assets,treeAtlas,layout,mobile,quality,shadows]);
  useFrame(state=>{
    rendered.projection.multiplyMatrices(state.camera.projectionMatrix,state.camera.matrixWorldInverse);rendered.frustum.setFromProjectionMatrix(rendered.projection);
    for(let i=0;i<rendered.cullers.length;i++)rendered.cullers[i].update(rendered.frustum,!shadows||mobile||quality==='low');
    if(state.clock.elapsedTime<rendered.nextUpdate)return;
    rendered.nextUpdate=state.clock.elapsedTime+.25;
    for(let i=0;i<rendered.cells.length;i++){
      const cell=rendered.cells[i],dx=state.camera.position.x-cell.x,dz=state.camera.position.z-cell.z;
      const distanceSq=dx*dx+dz*dz;
      cell.group.visible=distanceSq<=cell.rangeSq&&distanceSq>=cell.minimumSq;
    }
  });
  useEffect(()=>()=>{rendered.group.traverse(object=>{
    if(object instanceof InstancedMesh)object.dispose();
  });rendered.geometries.forEach(geometry=>geometry.dispose());rendered.materials.forEach(material=>material.dispose());rendered.impostorTexture.dispose();},[rendered]);
  return <><primitive object={rendered.group}/>{layout.filter(p=>p.asset!=='shrub_01').map((p,index)=>{
    const half:[number,number,number]=p.asset==='island_tree_02'?[.20,1.1,.20]:p.asset==='street_lamp_01'?[.12,1.9,.12]:p.asset==='utility_box_02'?[.46,.56,.22]:[.58,.44,.25];
    return <RigidBody key={index} type="fixed" colliders={false} position={[p.x,p.y+half[1]*p.scale,p.z]} rotation={[0,p.yaw,0]}>
      <CuboidCollider args={[half[0]*p.scale,half[1]*p.scale,half[2]*p.scale]} friction={.65} restitution={.08}/>
    </RigidBody>;
  })}</>;
}
