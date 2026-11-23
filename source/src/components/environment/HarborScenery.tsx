import {Suspense,useEffect,useMemo} from 'react';
import {useFrame} from '@react-three/fiber';
import {useTexture} from '@react-three/drei';
import {CuboidCollider,RigidBody} from '@react-three/rapier';
import {useTerrainData} from '@/components/terrain/TerrainContext';
import {useSettingsStore} from '@/store/settingsStore';
import {HARBOR_BUILDINGS,HARBOR_GARDENS} from '@/config/harborScenery';
import {getInterpolatedHeight} from '@/utils/terrainCompiler';
import {isMobileOrAndroid} from '@/utils/device';
import {buildHarborArchitecture} from '@/utils/harborArchitecture';
import {createHarborRenderResources} from '@/utils/harborRendering';
import {HarborGroundOcclusion} from './HarborGroundOcclusion';
import {HarborParkedVehicles} from './HarborParkedVehicles';
import {CoastalPhotogrammetry} from './CoastalPhotogrammetry';
import {EnvironmentErrorBoundary} from '@/components/canvas/EnvironmentErrorBoundary';

const MATERIAL_IDS=['white_stucco','red_brick','exterior_wall_cladding','rectangular_paving','grass_ground'] as const;

/** Authored architectural families and photographed street dressing for Harbor Ring. */
export function HarborScenery(){
  const {levelData}=useTerrainData();
  return levelData.id==='level6_gymkhana_harbor'?<HarborUrbanDetails/>:null;
}
function HarborUrbanDetails(){
  const {levelData,heightmapData}=useTerrainData();
  const shadows=useSettingsStore(s=>s.shadowsEnabled);
  const quality=useSettingsStore(s=>s.graphicsQuality);
  const mobile=isMobileOrAndroid();
  const suffix=mobile||quality==='low'?'-mobile':'';
  const urban=useTexture(MATERIAL_IDS.flatMap(name=>['color','normal','roughness'].map(channel=>
    `/textures/coastal/${name}-${channel}${suffix}.webp`)));
  const asphalt=useTexture(['albedo','normal','roughness'].map(channel=>`/textures/pbr/asphalt-${channel}${suffix}.webp`));
  const signTexture=useTexture('/images/ui/coastal-market.svg');
  const heights=useMemo(()=>HARBOR_BUILDINGS.map(b=>getInterpolatedHeight(b.x,b.z,
    heightmapData.heights,heightmapData.rows,heightmapData.cols,levelData.terrainBase.width,levelData.terrainBase.depth)),[heightmapData,levelData]);
  const architecture=useMemo(()=>buildHarborArchitecture(heights),[heights]);
  const rendered=useMemo(()=>createHarborRenderResources(architecture,urban,signTexture,quality,mobile,shadows,asphalt),
    [architecture,urban,signTexture,quality,shadows,mobile,asphalt]);
  useEffect(()=>()=>rendered.dispose(),[rendered]);
  useFrame(state=>rendered.updateVisibility(state.camera,state.clock.elapsedTime));
  return <><primitive object={rendered.group}/>
    <HarborGroundOcclusion heights={heights}/>
    {HARBOR_GARDENS.filter(g=>g[2]>20).flatMap(([x,z,,d])=>Array.from({length:5},(_,bay)=>{
      const pz=z-d*.36+bay*d*.18;
      return <RigidBody key={`garden:${x}:${bay}`} type="fixed" colliders={false} position={[x,8.2,pz]}>
        <CuboidCollider args={[5,.1,1.6]} position={[0,4.02,0]}/>
        {[-1,1].map(side=><CuboidCollider key={`post:${side}`} args={[.09,2,.09]} position={[side*4.5,2,0]}/>)}
        {[-1,1].map(side=><CuboidCollider key={`seat:${side}`} args={[.3,.35,1.4]} position={[side*3.2,.4,2.5]}/>)}
      </RigidBody>;
    }))}
    <EnvironmentErrorBoundary><Suspense fallback={null}><HarborParkedVehicles/></Suspense></EnvironmentErrorBoundary>
    <EnvironmentErrorBoundary><Suspense fallback={null}><CoastalPhotogrammetry/></Suspense></EnvironmentErrorBoundary>
    {HARBOR_BUILDINGS.map((b,i)=><RigidBody key={i} type="fixed" colliders={false} position={[b.x,heights[i]+b.height/2,b.z]}>
      <CuboidCollider args={[b.width/2,b.height/2,b.depth/2]} friction={0.4} restitution={0.05}/>
      {i>=12&&<><CuboidCollider args={[b.width*.34,3,b.depth*.34]} position={[0,b.height/2+3,0]}/><CuboidCollider args={[b.width*.215,1,b.depth*.215]} position={[0,b.height/2+7,0]}/></>}
    </RigidBody>)}
  </>;
}
