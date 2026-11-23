import {useCallback} from 'react';
import {Bounds,useBounds} from '@react-three/drei';
import {useThree} from '@react-three/fiber';
import {PerspectiveCamera,Vector3} from 'three';
import type {VehiclePreset} from '@/types';
import {CarModelDisplay} from './CarModelDisplay';
import {previewCameraDistance} from './previewFraming';

function VehicleContents({preset}:{preset:VehiclePreset}) {
  const bounds=useBounds();
  const camera=useThree(state=>state.camera);
  const aspect=useThree(state=>state.size.width/Math.max(1,state.size.height));
  const fitLoadedModel=useCallback(()=>{
    bounds.refresh().clip();
    if(!(camera instanceof PerspectiveCamera)){bounds.fit();return;}
    const {center,size}=bounds.getSize();
    const direction=new Vector3().subVectors(camera.position,center).normalize();
    const distance=previewCameraDistance(size,direction,camera.up,camera.fov,aspect);
    bounds.moveTo(direction.multiplyScalar(distance).add(center)).lookAt({target:center});
  },[bounds,camera,aspect]);
  return <CarModelDisplay preset={preset} onReady={fitLoadedModel}/>;
}

/** Fit the actual loaded body and wheels, including differently sized vehicle models. */
export function FittedVehiclePreview({preset}:{preset:VehiclePreset}) {
  return <Bounds key={preset.id} margin={1.35} maxDuration={0.35}><VehicleContents preset={preset}/></Bounds>;
}
