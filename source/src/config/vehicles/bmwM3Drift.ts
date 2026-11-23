import { createVehiclePreset, createSymmetricWheels } from '@/utils/builders/vehicleBuilder';
export const VEHICLE_BMW_M3_DRIFT = createVehiclePreset({
  id:'bmw_m3_drift',name:'BMW M3 · Aero Drift',category:'sports',archetype:'drift',
  description:'Tight, throttle-powered drifts. Wide steering lock, smooth rear breakaway and strong exits. Driver-controlled RWD · 2 NOS tanks.',
  modelPath:'/models/vehicles/bmw_m3_drift.glb',optimizedModelPath:'/models/vehicles/bmw_m3_drift.glb',
  modelScale:[1,1,1],modelPositionOffset:[0,0,0],
  stats:{topSpeed:9.2,acceleration:9,handling:9.5,offroad:3.5,driveType:'RWD'},
  config:{chassisMass:165,chassisSize:[1.96,.95,4.65],
    powerSlide:{torqueMultiplier:1.4,steeringSpeedReference:22,yawDamping:8},
    cabinCollider:{centerY:.355,centerZ:-.15,halfHeight:.515,length:2.25},
    weightDistribution:{frontBias:.51,engineOffsetZ:.75,engineOffsetY:-.2,centerOfMassZ:.025,centerOfMassY:-.4},
    engine:{maxForce:880,maxSpeed:310},drivetrain:{frontBias:0},
    brakes:{maxForce:29,handbrakeForce:48,frontBias:.65},
    aerodynamics:{downforceFactor:20,dragCoefficient:.38,frontalArea:1.95,dragMultiplier:1},
    wheels:createSymmetricWheels(2.73,1.64,-.2,{radius:.34,steerable:true,powered:false,suspensionStiffness:38,suspensionDamping:7.8,suspensionRestLength:.3,suspensionTravel:.22},
      {radius:.34,powered:true,suspensionStiffness:36,suspensionDamping:7.6,suspensionRestLength:.3,suspensionTravel:.22}),
  },
});
