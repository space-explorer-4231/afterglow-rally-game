import { createVehicleFinish } from '@/utils/vehicleFinish';
import {useMemo,useEffect} from 'react';
import {useFrame} from '@react-three/fiber';
import {useGLTF} from '@react-three/drei';
import {CuboidCollider,RigidBody} from '@react-three/rapier';
import {Color,Frustum,Group,InstancedMesh,Matrix4,Mesh,MeshStandardMaterial,Object3D,type BufferGeometry,type Material} from 'three';
import {HARBOR_PARKING} from '@/config/harborScenery';
import {useSettingsStore} from '@/store/settingsStore';
import {isMobileOrAndroid} from '@/utils/device';
import {partitionSpatialInstances} from '@/utils/spatialInstances';
import {versionedAsset} from '@/utils/versionedAsset';
import {bakeStaticGeometry} from '@/utils/bakeStaticGeometry';
import {createInstanceFrustumCuller} from '@/utils/instanceFrustumCulling';

/** A shared measured body-and-wheel asset dresses pull-offs without adding simulated cars. */
export function HarborParkedVehicles(){
  const {scene}=useGLTF(versionedAsset('/models/vehicles/aero-parked.glb'));
  const shadows=useSettingsStore(s=>s.shadowsEnabled);
  const quality=useSettingsStore(s=>s.graphicsQuality);
  const mobile=isMobileOrAndroid();
  const resources=useMemo(()=>{
    const group=new Group(),dummy=new Object3D(),color=new Color();
    const geometries:BufferGeometry[]=[],materials:Material[]=[],cells:{group:Group;x:number;z:number}[]=[];
    const cullers:ReturnType<typeof createInstanceFrustumCuller>[]=[];
    const primitives:{geometry:BufferGeometry;material:Material|Material[];paint:boolean}[]=[];
    scene.updateMatrixWorld(true);
    scene.traverse(object=>{
      if(!(object instanceof Mesh))return;
      const geometry=bakeStaticGeometry(object.geometry,object.matrixWorld);geometries.push(geometry);
      const originals=Array.isArray(object.material)?object.material:[object.material];
      const copies=originals.map(source=>{const material=createVehicleFinish(source,quality,mobile);materials.push(material);
        if(material instanceof MeshStandardMaterial)material.envMapIntensity=.85;return material;});
      primitives.push({geometry,material:Array.isArray(object.material)?copies:copies[0],paint:originals.some(m=>m.name==='Body_Color')});
    });
    for(const placements of partitionSpatialInstances(HARBOR_PARKING,55)){
      const cell=new Group();
      for(const p of primitives){
        const mesh=new InstancedMesh(p.geometry,p.material,placements.length);
        placements.forEach((parking,i)=>{dummy.position.set(parking.x,parking.y,parking.z);dummy.rotation.set(0,parking.yaw,0);dummy.scale.setScalar(1);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
          if(p.paint)mesh.setColorAt(i,color.set(parking.color));});
        mesh.castShadow=shadows&&!mobile;mesh.receiveShadow=shadows&&!mobile;mesh.computeBoundingSphere();cell.add(mesh);
        cullers.push(createInstanceFrustumCuller(mesh));
      }
      cells.push({group:cell,x:placements.reduce((n,p)=>n+p.x,0)/placements.length,z:placements.reduce((n,p)=>n+p.z,0)/placements.length});group.add(cell);
    }
    return {group,cells,geometries,materials,cullers,frustum:new Frustum(),projection:new Matrix4(),nextUpdate:0};
  },[scene,shadows,mobile,quality]);
  const range=mobile||quality==='low'?90:quality==='medium'?150:240;
  useFrame(state=>{
    resources.projection.multiplyMatrices(state.camera.projectionMatrix,state.camera.matrixWorldInverse);resources.frustum.setFromProjectionMatrix(resources.projection);
    for(let i=0;i<resources.cullers.length;i++)resources.cullers[i].update(resources.frustum,!shadows||mobile||quality==='low');
    if(state.clock.elapsedTime<resources.nextUpdate)return;resources.nextUpdate=state.clock.elapsedTime+.25;
    for(let i=0;i<resources.cells.length;i++){const c=resources.cells[i],dx=state.camera.position.x-c.x,dz=state.camera.position.z-c.z;c.group.visible=dx*dx+dz*dz<=range*range;}});
  useEffect(()=>()=>{resources.group.traverse(object=>{if(object instanceof InstancedMesh)object.dispose();});
    resources.geometries.forEach(g=>g.dispose());resources.materials.forEach(m=>m.dispose());},[resources]);
  return <><primitive object={resources.group}/>{HARBOR_PARKING.map((p,i)=><RigidBody key={i} type="fixed" colliders={false}
    position={[p.x,p.y+.56,p.z]} rotation={[0,p.yaw,0]}><CuboidCollider args={[1.10,.53,2.20]} friction={.65} restitution={.08}/></RigidBody>)}</>;
}

