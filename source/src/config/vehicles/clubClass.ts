import type {VehiclePreset} from '@/types/vehicle';
import {clamp} from '@/utils/math';
/** Shared club racing envelope; mass, axle layout, suspension and drift character remain distinct. */
export function balanceClubClass(preset:VehiclePreset):VehiclePreset {
 const config=preset.config,mass=clamp(config.chassisMass*8,1100,2200),radius=config.wheels[0].radius;
 const trim=1+clamp((config.engine.maxForce/config.chassisMass-3.5)*.025,-.035,.035);
 const maxForce=mass*.48*(radius/.34)*trim;
 const maxSpeed=270+clamp((config.engine.maxSpeed-250)*.15,-12,12);
 return {...preset,stats:{...preset.stats,acceleration:8.5+(trim-1)*10,topSpeed:maxSpeed/31},config:{...config,engine:{...config.engine,maxForce,maxSpeed}}};
}
