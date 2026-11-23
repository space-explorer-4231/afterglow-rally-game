import {useEffect,useMemo,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import {useTexture} from '@react-three/drei';
import {CuboidCollider,RigidBody} from '@react-three/rapier';
import {BoxGeometry,CapsuleGeometry,CylinderGeometry,CatmullRomCurve3,Group,InstancedMesh,MeshStandardMaterial,Object3D,Vector3} from 'three';
import {useTerrainData} from '@/components/terrain/TerrainContext';
import {getInterpolatedHeight} from '@/utils/terrainCompiler';
import {planFestivalRoute,visitFestivalStops} from '@/utils/festivalRoute';
import {createFestivalScenery} from '@/utils/festivalScenery';
import {useGameStore} from '@/store/gameStore';
import {useSettingsStore} from '@/store/settingsStore';
import {useFestivalStore} from '@/store/festivalStore';

/** Solar lookouts, a discoverable route and a bounded decorative air shuttle fleet. */
export function FestivalWorld(){
  const {levelData,heightmapData}=useTerrainData();
  const quality=useSettingsStore(s=>s.graphicsQuality);
  // Reuse credited low-memory PBR sets; no new full-resolution texture pack.
  const textures=useTexture(['rectangular_paving','exterior_wall_cladding','grass_ground'].flatMap(name=>['color','normal','roughness'].map(channel=>`/textures/coastal/${name}-${channel}-mobile.webp`)));
  const data=useMemo(()=>{
    const height=(x:number,z:number)=>getInterpolatedHeight(x,z,heightmapData.heights,heightmapData.rows,heightmapData.cols,levelData.terrainBase.width,levelData.terrainBase.depth);
    const stops=planFestivalRoute(levelData),corners=stops.map(s=>[-1,1].flatMap(a=>[-1,1].map(b=>height(s.x+a*6,s.z+b*6))));
    const heights=corners.map(samples=>Math.max(...samples)),foundations=corners.map(samples=>Math.max(...samples)-Math.min(...samples)+.5);
    const scenery=createFestivalScenery(stops,heights,levelData.id.includes('sweden'),textures,foundations);
    const curve=new CatmullRomCurve3(levelData.track.points.map(p=>new Vector3(p.x,0,p.z)),true,'catmullrom',.5);
    const path=curve.getSpacedPoints(256);
    // Clearance includes skyline: these are decorative air vehicles, never traffic obstacles.
    const altitude=Math.max(...path.map(p=>height(p.x,p.z)))+(levelData.id.includes('harbor')?75:32);
    const count=quality==='low'?2:3,group=new Group(),dummy=new Object3D();
    const bodyGeometry=new CapsuleGeometry(.8,2.7,4,8);bodyGeometry.rotateX(Math.PI/2);
    const wingGeometry=new BoxGeometry(5,.15,1.1),glassGeometry=new CapsuleGeometry(.6,1.3,3,8);glassGeometry.rotateX(Math.PI/2);
    const bodyMaterial=new MeshStandardMaterial({color:'#f4eee0',metalness:.45,roughness:.3});
    const wingMaterial=new MeshStandardMaterial({color:'#c96a42',metalness:.3,roughness:.4});
    const glassMaterial=new MeshStandardMaterial({color:'#3c776c',metalness:.7,roughness:.18});
    const bodies=new InstancedMesh(bodyGeometry,bodyMaterial,count),wings=new InstancedMesh(wingGeometry,wingMaterial,count),glass=new InstancedMesh(glassGeometry,glassMaterial,count);
    const rotorGeometry=new BoxGeometry(2.3,.035,.12),ringGeometry=new CylinderGeometry(1.25,1.25,.06,12,1,true);
    const rotors=new InstancedMesh(rotorGeometry,wingMaterial,count*4),rings=new InstancedMesh(ringGeometry,bodyMaterial,count*4);
    rotors.frustumCulled=false;rings.frustumCulled=false;group.add(rotors,rings);
    group.add(bodies,wings,glass);for(const mesh of [bodies,wings,glass])mesh.frustumCulled=false;
    return {stops,heights,foundations,scenery,path,altitude,count,group,dummy,bodies,wings,glass,rotors,rings,dispose:()=>{
      scenery.dispose();for(const mesh of [bodies,wings,glass,rotors,rings])mesh.dispose();
      for(const geo of [bodyGeometry,wingGeometry,glassGeometry,rotorGeometry,ringGeometry])geo.dispose();for(const mat of [bodyMaterial,wingMaterial,glassMaterial])mat.dispose();
    }};
  },[levelData,heightmapData,quality,textures]);
  const animation=useRef(data);
  useEffect(()=>{animation.current=data;},[data]);
  useEffect(()=>{
    useFestivalStore.getState().setProgress(0,data.stops.length);
    const timer=window.setInterval(()=>{
      const game=useGameStore.getState();if(game.gameState!=='playing'||game.gameMode!=='freeroam'||!game.isSceneReady||game.isAirborne||document.hidden)return;
      const state=useFestivalStore.getState(),mask=visitFestivalStops(data.stops,state.mask,game.position[0],game.position[2]);
      if(mask!==state.mask)state.setProgress(mask,data.stops.length);
    },200);
    return()=>{window.clearInterval(timer);data.dispose();};
  },[data]);
  useFrame(()=>{
    if(useGameStore.getState().gameState==='paused')return;
    const data=animation.current;
    const time=Date.now()/1000;
    for(let i=0;i<data.count;i++){
      const t=((time*.005+i/data.count)%1)*256,index=Math.floor(t),blend=t-index,a=data.path[index],b=data.path[index+1];
      const x=a.x+(b.x-a.x)*blend,z=a.z+(b.z-a.z)*blend,y=data.altitude+Math.sin(time*.4+i)*.7;
      data.dummy.position.set(x,y,z);data.dummy.rotation.set(0,Math.atan2(b.x-a.x,b.z-a.z),0);data.dummy.scale.set(1,1,1);data.dummy.updateMatrix();
      for(let rotor=0;rotor<4;rotor++){
        const angle=Math.atan2(b.x-a.x,b.z-a.z),side=rotor%2===0?-1:1,fore=rotor<2?-1:1;
        data.dummy.position.set(x+Math.cos(angle)*side*2.2+Math.sin(angle)*fore*1.3,y+.35,z-Math.sin(angle)*side*2.2+Math.cos(angle)*fore*1.3);
        data.dummy.rotation.y=angle;data.dummy.updateMatrix();data.rings.setMatrixAt(i*4+rotor,data.dummy.matrix);
        data.dummy.rotation.y=angle+time*35*(side*fore);data.dummy.updateMatrix();data.rotors.setMatrixAt(i*4+rotor,data.dummy.matrix);
      }
      data.dummy.position.set(x,y,z);data.dummy.rotation.set(0,Math.atan2(b.x-a.x,b.z-a.z),0);data.dummy.updateMatrix();
      data.bodies.setMatrixAt(i,data.dummy.matrix);data.wings.setMatrixAt(i,data.dummy.matrix);
      data.dummy.position.y+=.6;data.dummy.updateMatrix();data.glass.setMatrixAt(i,data.dummy.matrix);
    }
    data.rotors.instanceMatrix.needsUpdate=true;data.rings.instanceMatrix.needsUpdate=true;
    data.bodies.instanceMatrix.needsUpdate=true;data.wings.instanceMatrix.needsUpdate=true;data.glass.instanceMatrix.needsUpdate=true;
  });
  return <><primitive object={data.scenery.group}/><primitive object={data.group}/>
    {data.stops.map((s,i)=><RigidBody key={s.id} type="fixed" colliders={false} position={[s.x,data.heights[i],s.z]} rotation={[0,s.yaw,0]}>
      <CuboidCollider args={[5.5,.2,4]} position={[0,.2,0]}/><CuboidCollider args={[6,.15,4.5]} position={[0,5.2,0]}/>
      <CuboidCollider args={[.18,2.75,.18]} position={[0,8.1,0]}/>
      {[-4.5,4.5].map(x=><CuboidCollider key={`planter:${x}`} args={[.6,.7,.75]} position={[x,.9,2.7]}/>)}
      {[-4.3,4.3].map(x=><CuboidCollider key={`bench:${x}`} args={[.3,.4,1.5]} position={[x,.7,-1.5]}/>)}
      {[-4.5,4.5].flatMap(x=>[-2.8,2.8].map(z=><CuboidCollider key={`${x}:${z}`} args={[.13,2.4,.13]} position={[x,2.8,z]}/>))}
      {[-4.5,4.5].flatMap(x=>[-2.8,2.8].map(z=><CuboidCollider key={`footing:${x}:${z}`} args={[.3,data.foundations[i]/2,.3]} position={[x,-data.foundations[i]/2,z]}/>))}
    </RigidBody>)}
  </>;
}
