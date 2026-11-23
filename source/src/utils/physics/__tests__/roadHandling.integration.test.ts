import { beforeAll, describe, expect, it } from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import { Quaternion, Vector3 } from 'three';
import { ZEPHYR_WR4_VEHICLE_CONFIG } from '@/config/vehicles/zephyrWR4';
import { VEHICLE_REGISTRY } from '@/config/vehicleRegistry';
import { LEVEL5_GYMKHANA_DATA } from '@/config/levels/gymkhanaIsland';
import { applyTireFrictionAndBrakes } from '../tires';
import { applyDrivetrain } from '../drivetrain';
import { applyAssists } from '../assists';
import { createDriftInputState, prepareDriftInput } from '../driftInput';
import { applyDriftMomentum } from '../driftMomentum';
import type { InputState } from '@/types/game';
import type { VehicleConfig } from '@/types/vehicle';
import { blendInputs } from '@/hooks/useInput';
import { PerspectiveCamera } from 'three';
import { STRADALE_GT_CONFIG } from '@/config/vehicles/stradaleGT';
import { updateGearbox } from '../powertrain';

beforeAll(async () => { await RAPIER.init(); });
function runRoadScenario(throttle: number, brake: number, handbrake = false, steering = 0, hz = 60, config: VehicleConfig = ZEPHYR_WR4_VEHICLE_CONFIG, releaseAt = Infinity, startSpeed = 80, automatic = false) {
  const dt = 1 / hz;
  const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  world.timestep = dt;
  world.createCollider(RAPIER.ColliderDesc.cuboid(1000, 0.1, 1000).setTranslation(0, 5.9, 0));
  // Match the live body: explicit RigidBody mass plus collider mass contributions.
  const body = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(0, 6.85, 0).setLinearDamping(0.08).setAngularDamping(0.6));
  world.createCollider(RAPIER.ColliderDesc.cuboid(0.85, 0.2, 1.8).setTranslation(0, -0.14, 0).setMass(config.chassisMass * 2), body);
  const controller = world.createVehicleController(body);
  config.wheels.forEach((w,i) => {
    controller.addWheel({x:w.position[0],y:w.position[1],z:w.position[2]}, {x:0,y:-1,z:0}, {x:-1,y:0,z:0},w.suspensionRestLength,w.radius);
    controller.setWheelSuspensionStiffness(i,w.suspensionStiffness);
    controller.setWheelSuspensionCompression(i,w.suspensionCompression ?? w.suspensionDamping*0.75);
    controller.setWheelSuspensionRelaxation(i,w.suspensionRelaxation ?? w.suspensionDamping*1.15);
    controller.setWheelMaxSuspensionTravel(i,w.suspensionTravel);
    controller.setWheelMaxSuspensionForce(i,85000);
  });
  const input: InputState = { throttle, brake, handbrake, steering, cameraToggle:false,reset:false };
  const velocity = new Vector3(); const rotation = new Quaternion();
  const driftState = createDriftInputState();
  for (let i=0;i<hz*2;i++) { controller.updateVehicle(dt); world.step(); }
  body.setLinvel({x:0,y:0,z:startSpeed/3.6},true);
  const start = body.translation();
  let duration=0, peakYaw=0, maxSlip=0, distance=0, entryYaw=0, entrySlip=0, entryX=0, entryZ=0, finalSlip=0;
  let currentGear=startSpeed===0?1:3;
  for (let i=0;i<hz*8;i++) {
    const q=body.rotation(); rotation.set(q.x,q.y,q.z,q.w).invert();
    const v=body.linvel(); velocity.set(v.x,v.y,v.z).applyQuaternion(rotation);
    const speed=Math.hypot(v.x,v.z); const slip=Math.atan2(velocity.x,Math.max(0.01,velocity.z));
    finalSlip=slip;
    if(duration>=releaseAt){input.handbrake=false;input.steering=0;}
    const driveInput=prepareDriftInput(driftState,input,dt,speed*3.6,true,true);
    if(automatic) currentGear=updateGearbox(speed*3.6,velocity.z,driveInput,currentGear,false,{slipAngle:slip});
    applyTireFrictionAndBrakes(controller,config,driveInput,speed*3.6,velocity.z,0,7,0,slip,undefined,LEVEL5_GYMKHANA_DATA,undefined,undefined,undefined,{ currentGear,isManual:!automatic,dt,bodyMass:body.mass(),driftSustain:driftState.sustaining });
    applyDrivetrain(controller,config,driveInput,velocity.z,currentGear,slip,speed*3.6,1,undefined,undefined,'tarmac',0,dt,{isManual:!automatic});
    applyAssists(body,config,input,velocity.z,dt,undefined,{driftSustain:driftState.sustaining,slipAngle:slip});
    controller.updateVehicle(dt); if(driftState.sustaining) applyDriftMomentum(body,input.steering,dt); world.step(); duration+=dt;
    if (i===Math.floor(hz/3)) {entryYaw=body.angvel().y;entrySlip=slip;entryX=body.translation().x-start.x;entryZ=body.translation().z-start.z;}
    peakYaw=Math.max(peakYaw,Math.abs(body.angvel().y)); if (speed > 4) maxSlip=Math.max(maxSlip,Math.abs(slip));
    const p=body.translation(); distance=Math.hypot(p.x-start.x,p.z-start.z);
    if (speed < 0.5 && brake > 0.5 && !automatic) break;
  }
  const endSpeed=Math.hypot(body.linvel().x,body.linvel().z)*3.6;
  const pos=body.translation(); const vel=body.linvel();
  const result={ throttle,brake,handbrake,steering,hz,duration,distance,peakYaw,maxSlip,endSpeed,entryYaw,entrySlip,entryX,entryZ,finalSlip,dx:pos.x-start.x,dz:pos.z-start.z,vz:vel.z };
  world.free(); return result;
}
describe('Live Rapier road behavior', () => {
  it('drives W/Up toward the modeled nose and A/Left toward the left of the chase screen',()=>{
    for(const keys of [new Set(['KeyW','KeyA']),new Set(['ArrowUp','ArrowLeft'])]){
      const input=blendInputs({dt:1,prevSteering:0,keys,touch:{},gp:{}}).state;
      const forward=runRoadScenario(input.throttle,0,false,0,60,STRADALE_GT_CONFIG,Infinity,0,true);
      expect(forward.dz).toBeGreaterThan(20);
      const turn=runRoadScenario(input.throttle,0,false,input.steering,60,STRADALE_GT_CONFIG);
      // Three.js camera looking along +Z has screen-left along +X.
      const camera=new PerspectiveCamera();camera.position.set(0,4,-14);camera.lookAt(0,1,5);camera.updateMatrixWorld();
      const screen=new Vector3(turn.entryX,0,turn.entryZ).applyMatrix4(camera.matrixWorldInverse);
      console.info('KEYBOARD DIRECTION',JSON.stringify({keys:[...keys],forward,turn,screenX:screen.x}));
      expect(turn.entryYaw).toBeGreaterThan(0.1);
      expect(screen.x).toBeLessThan(0);
    }
  });
  it('mirrors D/Right and lets S/Down reverse from rest with automatic gears',()=>{
    for(const codes of [['KeyD','KeyS'],['ArrowRight','ArrowDown']]){
      const steer=blendInputs({dt:1,prevSteering:0,keys:new Set([codes[0]]),touch:{},gp:{}}).state;
      const turn=runRoadScenario(1,0,false,steer.steering,60,STRADALE_GT_CONFIG);
      expect(turn.entryYaw).toBeLessThan(-0.1);expect(turn.entryX).toBeLessThan(0);
      const reverse=blendInputs({dt:1,prevSteering:0,keys:new Set([codes[1]]),touch:{},gp:{}}).state;
      const result=runRoadScenario(0,reverse.brake,false,0,60,STRADALE_GT_CONFIG,Infinity,0,true);
      expect(result.dz).toBeLessThan(-10);expect(result.vz).toBeLessThan(-1);
    }
  });
  it('stops from 80 km/h without accelerator overlap defeating the brakes', () => {
    const stop=runRoadScenario(0,1); const overlap=runRoadScenario(1,1);
    console.info('ROAD BRAKES',JSON.stringify({stop,overlap}));
    expect(stop.distance).toBeGreaterThan(20); expect(stop.distance).toBeLessThan(32);
    expect(overlap.endSpeed).toBeLessThan(2);
    expect(overlap.distance).toBeCloseTo(stop.distance, 1);
  });
  it('measures sustained handbrake turning', () => {
    const slide=runRoadScenario(0.65,0,true,0.75);
    console.info('ROAD SLIDE',JSON.stringify(slide));
    expect(slide.peakYaw).toBeLessThan(2.1);
    expect(slide.duration).toBeCloseTo(8, 1);
    expect(slide.endSpeed).toBeGreaterThan(35);
    expect(slide.entryYaw).toBeGreaterThan(0.3); // +left input turns toward camera-left.
    expect(slide.maxSlip).toBeLessThan(1.15);
  });
  it('keeps braking distance consistent at different physics step rates', () => {
    const slow=runRoadScenario(0,1,false,0,30), fast=runRoadScenario(0,1,false,0,120);
    console.info('ROAD STEP RATES',JSON.stringify({slow,fast}));
    expect(Math.abs(slow.distance-fast.distance)).toBeLessThan(1.2);
  });
  it('mirrors left and right turns and catches the slide after release',()=>{
    const right=runRoadScenario(0.65,0,true,-0.75);
    expect(right.entryYaw).toBeLessThan(-0.3);
    const recovered=runRoadScenario(0.65,0,true,0.75,60,ZEPHYR_WR4_VEHICLE_CONFIG,2);
    console.info('ROAD RECOVERY',JSON.stringify(recovered));
    expect(Math.abs(recovered.finalSlip)).toBeLessThan(0.12);
    expect(recovered.endSpeed).toBeGreaterThan(35);
  });
  it('stops all eight vehicle presets and mirrors their sustained handbrake rotation', () => {
    for (const preset of Object.values(VEHICLE_REGISTRY)) {
      const stop=runRoadScenario(1,1,false,0,60,preset.config);
      const slide=runRoadScenario(0.65,0,true,0.75,60,preset.config);
      const right=runRoadScenario(0.65,0,true,-0.75,60,preset.config);
      console.info('ROAD FLEET',JSON.stringify({id:preset.id,stop,slide,right}));
      expect(stop.distance, preset.id).toBeGreaterThan(18);
      expect(stop.distance, preset.id).toBeLessThan(34);
      expect(stop.endSpeed, preset.id).toBeLessThan(2);
      expect(slide.peakYaw, preset.id).toBeLessThan(2.3);
      expect(slide.maxSlip, preset.id).toBeLessThan(1.3);
      expect(slide.endSpeed, preset.id).toBeGreaterThan(30);
      expect(Math.abs(slide.endSpeed-right.endSpeed),preset.id).toBeLessThan(1);
      expect(Math.abs(slide.maxSlip-right.maxSlip),preset.id).toBeLessThan(0.03);
      expect(Math.abs(slide.peakYaw-right.peakYaw),preset.id).toBeLessThan(0.06);
      expect(Math.abs(slide.dx+right.dx),preset.id).toBeLessThan(2);
      expect(Math.abs(slide.dz-right.dz),preset.id).toBeLessThan(2);
    }
  });
});
