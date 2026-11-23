import RAPIER from '@dimforge/rapier3d-compat';
import {CatmullRomCurve3,Vector3,Quaternion} from 'three';
import {writeFileSync,mkdirSync} from 'node:fs';
import {getAvailableLevels} from '@/config/levelRegistry';
import {getAvailableVehicles} from '@/config/vehicleRegistry';
import {compileTerrain} from '@/utils/terrainCompiler';
import {calculateGroundedVehicleTransform} from '@/utils/physics/groundSettler';
import {createRoadVehicleConfig} from '@/utils/physics/roadVehicle';
import {createContactTractionState,configureContactSuspension,applyContactTraction} from '@/utils/physics/contactTraction';
import {getSurfaceAtPosition} from '@/utils/physics/tires';
import {updateGearbox} from '@/utils/physics/powertrain';
import {applyAerodynamics} from '@/utils/physics/aerodynamics';
import type {InputState} from '@/types/game';

/** Offline actual-Rapier terrain soak. No rendered frames, NPCs or network are simulated. */
export async function auditFleetMaps(output:string,seconds=60):Promise<void>{
 await RAPIER.init();const results=[];const start=performance.now();
 for(const level of getAvailableLevels()){
  const terrain=compileTerrain(level.data),base=level.data.terrainBase,transposed=new Float32Array(terrain.heights.length);
  for(let row=0;row<terrain.rows;row++)for(let col=0;col<terrain.cols;col++)transposed[col*terrain.rows+row]=terrain.heights[row*terrain.cols+col];
  const curve=new CatmullRomCurve3(level.data.track.points.map(p=>new Vector3(p.x,0,p.z)),true,'catmullrom',.5),path=curve.getSpacedPoints(1024),length=curve.getLength();
  for(const car of getAvailableVehicles()){
   const world=new RAPIER.World({x:0,y:-9.81,z:0}),dt=1/60;world.timestep=dt;
   world.createCollider(RAPIER.ColliderDesc.heightfield(terrain.rows-1,terrain.cols-1,transposed,{x:base.width,y:1,z:base.depth}));
   const config=createRoadVehicleConfig(car.config),heading=Math.atan2(path[1].x-path[0].x,path[1].z-path[0].z);
   const spawn=calculateGroundedVehicleTransform([path[0].x,0,path[0].z],heading,config,terrain,level.data);
   const body=world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(...spawn.position).setRotation({x:spawn.rotation[0],y:spawn.rotation[1],z:spawn.rotation[2],w:spawn.rotation[3]}).setLinearDamping(.08).setAngularDamping(.18));
   world.createCollider(RAPIER.ColliderDesc.cuboid(config.chassisSize[0]*.44,.2,config.chassisSize[2]*.4).setTranslation(0,-.14,0).setMass(config.chassisMass),body);
   const controller=world.createVehicleController(body);
   config.wheels.forEach((wheel,i)=>{controller.addWheel({x:wheel.position[0],y:wheel.position[1],z:wheel.position[2]},{x:0,y:-1,z:0},{x:-1,y:0,z:0},wheel.suspensionRestLength,wheel.radius);controller.setWheelSuspensionCompression(i,wheel.suspensionDamping*.75);controller.setWheelSuspensionRelaxation(i,wheel.suspensionDamping*1.15);controller.setWheelMaxSuspensionTravel(i,wheel.suspensionTravel);});
   configureContactSuspension(controller,config);const state=createContactTractionState(),inverse=new Quaternion(),local=new Vector3(),velocity=new Vector3();
   const input:InputState={throttle:0,brake:0,steering:0,handbrake:false,reset:false,cameraToggle:false,nitro:false};
   for(let step=0;step<120;step++){controller.updateVehicle(dt);world.step();}
   let gear=1,index=0,distance=0,onRoad=0,peakSpeed=0,driftSeconds=0,rollovers=0,airborneSeconds=0,recovery=0,invalid=0,peakYaw=0,boostTicks=0;
   for(let step=0;step<seconds*60;step++){
    const pos=body.translation(),rot=body.rotation(),v=body.linvel();inverse.set(rot.x,rot.y,rot.z,rot.w).invert();local.set(v.x,v.y,v.z).applyQuaternion(inverse);const speed=Math.hypot(local.x,local.z);
    if(![pos.x,pos.y,pos.z,speed].every(Number.isFinite)){invalid++;break;}
    let nearest=Infinity,next=index;for(let offset=-18;offset<=30;offset++){const i=(index+offset+1024)%1024,p=path[i],d=(p.x-pos.x)**2+(p.z-pos.z)**2;if(d<nearest){nearest=d;next=i;}}
    let change=next-index;if(change< -512)change+=1024;else if(change>512)change-=1024;distance+=Math.max(0,change)*length/1024;index=next;
    if(Math.sqrt(nearest)<=level.data.track.width/2)onRoad++;
    const upright=1-2*(rot.x*rot.x+rot.z*rot.z);if(upright<.3||pos.y<level.fallResetY){
      rollovers++;const p=path[index],n=path[(index+1)%1024],reset=calculateGroundedVehicleTransform([p.x,0,p.z],Math.atan2(n.x-p.x,n.z-p.z),config,terrain,level.data);
      body.setTranslation({x:reset.position[0],y:reset.position[1]+.15,z:reset.position[2]},true);body.setRotation({x:reset.rotation[0],y:reset.rotation[1],z:reset.rotation[2],w:reset.rotation[3]},true);body.setLinvel({x:0,y:0,z:0},true);body.setAngvel({x:0,y:0,z:0},true);recovery=180;
    }
    if(recovery>0){recovery--;body.setLinvel({x:0,y:0,z:0},true);body.setAngvel({x:0,y:0,z:0},true);world.step();continue;}
    const ahead=Math.max(5,Math.round((9+speed*.55)/length*1024)),target=path[(index+ahead)%1024];local.set(target.x-pos.x,0,target.z-pos.z).applyQuaternion(inverse);const error=Math.atan2(local.x,local.z);
    const far=path[(index+ahead*2)%1024],bend=Math.abs(Math.atan2(far.x-target.x,far.z-target.z)-Math.atan2(target.x-pos.x,target.z-pos.z)),angle=Math.min(bend,Math.abs(bend-Math.PI*2));
    const desired=Math.max(12,Math.min(35,33/(1+angle*2.5))),limit=(config.contactHandling?.steeringLock??.54)/(1+(speed/(config.powerSlide?.steeringSpeedReference??14))**1.35);
    input.steering=Math.max(-1,Math.min(1,error/Math.max(.1,limit)*.8));input.throttle=speed<desired?1:.12;input.brake=speed>desired+2?.6:0;input.handbrake=angle>.45&&speed>12&&step%1200<12;input.nitro=step%900<90&&Math.abs(error)<.25&&input.brake===0;
    local.set(v.x,v.y,v.z).applyQuaternion(inverse);const slip=Math.atan2(local.x,Math.max(2,Math.abs(local.z)));gear=updateGearbox(speed*3.6,local.z,input,gear,false,{slipAngle:slip});
    controller.updateVehicle(dt);let contacts=0;for(let i=0;i<4;i++)if(controller.wheelIsInContact(i))contacts++;
    applyContactTraction(body,controller,config,state,input,car.stats.driveType,gear,false,getSurfaceAtPosition(pos.x,pos.y,pos.z,terrain,level.data),level.recommendedTire,dt,true,true,true);
    velocity.set(v.x,v.y,v.z);applyAerodynamics(body,config,local.z,velocity,pos.y,dt);world.step();peakSpeed=Math.max(peakSpeed,speed*3.6);peakYaw=Math.max(peakYaw,Math.abs(body.angvel().y));if(Math.abs(slip)>.15&&Math.abs(slip)<1&&speed>7)driftSeconds+=dt;if(contacts<3)airborneSeconds+=dt;if(state.nitro.active)boostTicks++;
   }
   const row={car:car.id,map:level.id,seconds,steps:seconds*60,distance:Math.round(distance),routeMetresPerSecond:distance/seconds,onRoadPercent:onRoad/(seconds*60)*100,peakSpeed,driftSeconds,rollovers,airborneSeconds,invalid,peakYaw,boostTicks};results.push(row);world.free();console.log(JSON.stringify(row));
  }
 }
 mkdirSync(output.slice(0,output.lastIndexOf('/')),{recursive:true});writeFileSync(output,JSON.stringify({actualRapier:true,terrain:true,rendered:false,secondsPerPair:seconds,simulatedSeconds:results.length*seconds,wallSeconds:(performance.now()-start)/1000,results},null,2));
}
