import { createVehiclePreset, createSymmetricWheels } from '@/utils/builders/vehicleBuilder';
import type { VehiclePreset } from '@/types/vehicle';

interface FleetSpec { id: string; name: string; description: string; category: VehiclePreset['category']; force: number; speed: number; mass: number; width: number; length: number; height: number; base: number; radius: number; roof: number; rear: number; front: number; rearDrive?: boolean }
const SPECS: readonly FleetSpec[] = [
  { id:'meridian_rs',name:'Meridian RS Wagon',description:'Fast AWD touring wagon. Long-wheelbase grip and strong exits, traded for weight and slower turn-in.',category:'rally',force:780,speed:290,mass:180,width:1.96,length:4.7,height:1.1,base:2.92,radius:.34,roof:.9,rear:-1.85,front:.8 },
  { id:'voltline_xr',name:'Voltline XR',description:'Heavy electric AWD crossover. Rapid straight-line pull; longer stops and wider cornering lines.',category:'offroad',force:850,speed:280,mass:225,width:2.02,length:4.65,height:1.4,base:2.95,radius:.36,roof:1.2,rear:-1.55,front:.85 },
  { id:'ironclad_sprint',name:'Ironclad Sprint',description:'Torque-heavy street pickup. Quick launches and bump clearance, with a loose rear and less corner grip.',category:'offroad',force:870,speed:275,mass:205,width:2.08,length:4.95,height:1.3,base:3.05,radius:.38,roof:1.1,rear:-.25,front:1.05 },
  { id:'parcel_gt',name:'Parcel GT',description:'Tuned AWD delivery van. Still quick, but its tall body, slow steering and weak brakes reward smooth planning.',category:'arcade',force:800,speed:260,mass:210,width:2.02,length:4.85,height:1.75,base:3,radius:.36,roof:1.55,rear:-2.05,front:1.35 },
  { id:'nightfall_v8',name:'Nightfall V8',description:'Powerful rear-drive muscle coupe. High top end and smoky exits; throttle discipline matters more than raw grip.',category:'sports',force:920,speed:315,mass:175,width:2,length:4.75,height:.95,base:2.88,radius:.34,roof:.72,rear:-.95,front:.6,rearDrive:true },
];
export const SPEED_FLEET: readonly VehiclePreset[] = SPECS.map(spec => createVehiclePreset({
  id:spec.id,name:spec.name,description:spec.description,category:spec.category,archetype:'rally',
  modelPath:'/models/vehicles/'+spec.id+'.glb',optimizedModelPath:'/models/vehicles/'+spec.id+'_opt.glb',
  modelScale:[1,1,1],modelPositionOffset:[0,0,0],
  stats:{topSpeed:Math.min(10,spec.speed/34),acceleration:Math.min(10,spec.force/spec.mass*1.7),handling:spec.id==='meridian_rs'?8:spec.rearDrive?7.2:spec.id==='parcel_gt'?5.5:6.5,offroad:spec.category==='offroad'?7.5:spec.id==='parcel_gt'?4:5.5,driveType:spec.rearDrive?'RWD':'AWD'},
  config:{chassisMass:spec.mass,chassisSize:[spec.width,spec.height,spec.length],
    cabinCollider:{centerY:(spec.roof+.1-.16)/2,centerZ:(spec.rear+spec.front)/2,halfHeight:(spec.roof+.1+.16)/2,length:spec.front-spec.rear+.12},
    engine:{maxForce:spec.force,maxSpeed:spec.speed},drivetrain:{frontBias:spec.rearDrive?0:.42},
    aerodynamics:{downforceFactor:spec.rearDrive?18:spec.id==='meridian_rs'?22:12,dragCoefficient:spec.id==='parcel_gt'?.52:.42,frontalArea:spec.width*(spec.roof+.5),dragMultiplier:1},
    wheels:createSymmetricWheels(spec.base,spec.width-.14,-.2,{radius:spec.radius,suspensionStiffness:34,suspensionDamping:7.2,suspensionRestLength:.32,suspensionTravel:.26},
      {radius:spec.radius,suspensionStiffness:36,suspensionDamping:7.2,suspensionRestLength:.32,suspensionTravel:.26}),
  },
}));
export const SPEED_FLEET_IDS = SPEED_FLEET.map(preset=>preset.id);
