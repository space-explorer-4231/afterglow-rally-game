import type {VehiclePreset, VehicleConfig, WheelInfo} from '@/types/vehicle';
import {VANGUARD_GT_VEHICLE_CONFIG} from './vanguardGT';

/** Accessible arcade calibration; the licensed visual model is not a manufacturer physics claim. */
function wheel(index:number,x:number,z:number): WheelInfo {
  return {...VANGUARD_GT_VEHICLE_CONFIG.wheels[index],radius:0.35,position:[x,-0.2,z]};
}
export const STRADALE_GT_CONFIG: VehicleConfig = {
  ...VANGUARD_GT_VEHICLE_CONFIG,
  chassisSize:[2,0.55,4.45],
  wheels:[wheel(0,-0.835,1.155),wheel(1,0.835,1.155),wheel(2,-0.835,-1.495),wheel(3,0.835,-1.495)],
};
export const VEHICLE_STRADALE_GT: VehiclePreset = {
  id:'stradale_gt',name:'Aero S1',category:'sports',
  description:'Pearl-white roadster with electric-blue touring stripes, graphite alloy wheels, clearcoat paint and approachable assisted handling.',
  modelPath:'/models/vehicles/stradale-gt.glb',
  optimizedModelPath:'/models/vehicles/stradale-gt_opt.glb',
  wheelModelPath:'/models/vehicles/stradale-gt-wheel.glb',
  modelScale:[1,1,1],modelPositionOffset:[0,-0.878,0],modelRotationOffset:[0,Math.PI,0],
  stats:{topSpeed:9.4,acceleration:8.8,handling:9,offroad:4,driveType:'AWD'},
  config:STRADALE_GT_CONFIG,
};
