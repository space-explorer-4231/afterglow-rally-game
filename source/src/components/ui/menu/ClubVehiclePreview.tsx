import {Suspense,useRef,useEffect,type RefObject} from 'react';
import {Canvas,useFrame,useThree} from '@react-three/fiber';
import {OrbitControls,Environment} from '@react-three/drei';
import type {OrbitControls as OrbitControlsImpl} from 'three-stdlib';
import {getActiveGamepad} from '@/utils/input/gamepad';
import {FittedVehiclePreview} from './FittedVehiclePreview';
import './vehiclePreview.css';
import {GarageCanvasErrorBoundary} from './GarageCanvasErrorBoundary';
import type {VehiclePreset} from '@/types';

function ControllerOrbit({controls}:{controls:RefObject<OrbitControlsImpl|null>}) {
  const invalidate=useThree(s=>s.invalidate);
  useEffect(()=>{
    const timer=setInterval(()=>{if(Math.abs(getActiveGamepad()?.axes[2]??0)>.18)invalidate();},33);
    return()=>clearInterval(timer);
  },[invalidate]);
  useFrame((_,delta)=>{
    const orbit=controls.current,pad=getActiveGamepad();if(!orbit||!pad)return;
    const x=pad.axes[2]??0;
    if(Math.abs(x)>.18){orbit.setAzimuthalAngle(orbit.getAzimuthalAngle()-x*Math.min(delta,.1)*2);orbit.update();}
  });
  return null;
}

/** One demand-rendered preview, using the same vehicle meshes and wheels as the game. */
export function ClubVehiclePreview({vehicle}:{vehicle:VehiclePreset}) {
  const controls=useRef<OrbitControlsImpl>(null);
  return <figure className="club-vehicle-preview" tabIndex={0} aria-label={`${vehicle.name} actual 3D vehicle preview. Drag, right stick, or Alt and arrow keys to rotate.`}
    onKeyDown={event=>{if(event.altKey&&(event.key==='ArrowLeft'||event.key==='ArrowRight')){event.preventDefault();event.stopPropagation();const orbit=controls.current;if(orbit){orbit.setAzimuthalAngle(orbit.getAzimuthalAngle()+(event.key==='ArrowLeft'?.3:-.3));orbit.update();}}}}>
    <GarageCanvasErrorBoundary><Canvas frameloop="demand" dpr={[1,1.25]} camera={{position:[5,2.8,5],fov:38}} gl={{antialias:true,alpha:true}}>
      <ambientLight intensity={0.7}/><directionalLight position={[4,8,5]} intensity={1.8}/>
      <directionalLight position={[-4,3,-3]} intensity={1} color="#fff0d5"/>
      <Suspense fallback={null}><group dispose={null}><FittedVehiclePreview preset={vehicle}/></group><Environment files="/environments/rural-asphalt-road.hdr" resolution={64} environmentIntensity={0.65}/></Suspense>
      <OrbitControls makeDefault ref={controls} enablePan={false} enableZoom={false} target={[0,.4,0]} minPolarAngle={.3} maxPolarAngle={1.5}/>
      <ControllerOrbit controls={controls}/>
    </Canvas></GarageCanvasErrorBoundary>
    <figcaption><strong>{vehicle.name}</strong><span>{vehicle.stats.driveType} · {vehicle.category} · {vehicle.config.engine.maxSpeed} km/h</span><small>Drag to look around · right stick / Alt + arrows</small></figcaption>
  </figure>;
}
