import { SPEED_FLEET } from '@/config/vehicles/speedFleet';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import { Quaternion, Vector3 } from 'three';
import { STRADALE_GT_CONFIG } from '@/config/vehicles/stradaleGT';
import type { DrivetrainMode } from '@/types/settings';
import type { InputState } from '@/types/game';
import { createRoadVehicleConfig } from '../roadVehicle';
import { applyContactTraction, configureContactSuspension, createContactTractionState } from '../contactTraction';
import { updateGearbox } from '../powertrain';
import { VEHICLE_REGISTRY } from '@/config/vehicleRegistry';
import type { VehicleConfig, SurfaceType, TireType } from '@/types/vehicle';
import { appendFileSync } from 'node:fs';


beforeAll(async () => { await RAPIER.init(); });
function scenario(mode: DrivetrainMode, throttle: number, brake: number, steering = 0, handbrake = false,
  startSpeed = 0, releaseAt = Infinity, hz = 60, seconds = 6, source: VehicleConfig = STRADALE_GT_CONFIG, manualReverse = false, startHeading=0, startYaw=0,
  extra:{nitro?:boolean;handbrakeRelease?:number;steeringRelease?:number;driftTarget?:number;abs?:boolean;tcs?:boolean;esp?:boolean;brakeToStop?:boolean;trackAssists?:boolean;countersteerOnRelease?:boolean;holdDriftAfter?:number;surface?:SurfaceType;tire?:TireType}={}) {
  const config = createRoadVehicleConfig(source);
  const dt = 1 / hz, world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  world.timestep = dt;
  world.createCollider(RAPIER.ColliderDesc.cuboid(1000, 0.1, 1000).setTranslation(0, -0.1, 0));
  const body = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(0, 0.85, 0)
    .setLinearDamping(0.08).setAngularDamping(0.18));
  world.createCollider(RAPIER.ColliderDesc.cuboid(0.85, 0.2, 1.8).setTranslation(0, -0.14, 0).setMass(config.chassisMass), body);
  const controller = world.createVehicleController(body);
  config.wheels.forEach((w, i) => {
    controller.addWheel({ x: w.position[0], y: w.position[1], z: w.position[2] },
      { x: 0, y: -1, z: 0 }, { x: -1, y: 0, z: 0 }, w.suspensionRestLength, w.radius);
    controller.setWheelSuspensionStiffness(i, w.suspensionStiffness);
    controller.setWheelSuspensionCompression(i, w.suspensionDamping * 0.75);
    controller.setWheelSuspensionRelaxation(i, w.suspensionDamping * 1.15);
    controller.setWheelMaxSuspensionTravel(i, w.suspensionTravel);
  });
  configureContactSuspension(controller, config);
  const state = createContactTractionState();
  const input: InputState = { throttle, brake, steering, handbrake, cameraToggle: false, reset: false,nitro:extra.nitro };
  for (let i = 0; i < hz * 2; i++) { controller.updateVehicle(dt); world.step(); }
  body.setLinvel({ x: 0, y: 0, z: startSpeed / 3.6 }, true);
  if(startHeading)body.setRotation({x:0,y:Math.sin(startHeading/2),z:0,w:Math.cos(startHeading/2)},true);
  if(startYaw)body.setAngvel({x:0,y:startYaw,z:0},true);
  const assistTorque = extra.trackAssists ? vi.spyOn(body, 'applyTorqueImpulse') : undefined;
  const initial = body.translation(), inverse = new Quaternion(), local = new Vector3();
  let gear = manualReverse ? -1 : 1, peakYaw = 0, peakSlip = 0, burnoutSteps = 0, burnoutDistance = 0;
  let peakSpeed = 0;
  let finalSlip = 0, time = 0, peakSpin = 0, radiusSum = 0, radiusSamples = 0;
  let yawTravel=0,driftTicks=0,driftEntrySpeed=0,driftExitSpeed=0;
  for (let i = 0; i < hz * seconds; i++) {
    const rot = body.rotation(), v = body.linvel();
    inverse.set(rot.x, rot.y, rot.z, rot.w).invert(); local.set(v.x, v.y, v.z).applyQuaternion(inverse);
    const speed = Math.hypot(local.x, local.z);
    // A braking driver releases S at rest; continuing to hold S deliberately selects reverse.
    if(extra.brakeToStop&&startSpeed>0&&speed<1/3.6)break;
    peakSpeed = Math.max(peakSpeed, speed * 3.6);
    finalSlip = Math.atan2(local.x, Math.max(0.2, Math.abs(local.z)));
    if(time>=(extra.handbrakeRelease??releaseAt))input.handbrake=false;
    if(time>=(extra.steeringRelease??releaseAt))input.steering=extra.countersteerOnRelease?Math.max(-1,Math.min(1,finalSlip*5)):0;
    else if(time>=(extra.holdDriftAfter??Infinity))input.steering=0;
    // Virtual driver balances countersteering around a slide, rather than holding
    // full turn-in through an entire circle. The production car never uses this controller.
    else if(extra.driftTarget!==undefined&&time>.3)input.steering=Math.max(-1,Math.min(1,.2+4*(finalSlip-extra.driftTarget)));
    if (!manualReverse) gear = updateGearbox(speed * 3.6, local.z, input, gear, false, { slipAngle: finalSlip });
    controller.updateVehicle(dt);
    applyContactTraction(body, controller, config, state, input, mode, gear, manualReverse, extra.surface??'tarmac', extra.tire??'asphalt', dt, extra.abs??true, extra.tcs??false, extra.esp??true);
    world.step(); time += dt;
    yawTravel+=body.angvel().y*dt;
    if(Math.abs(finalSlip)>.18&&Math.abs(finalSlip)<.96&&speed>8&&time<(extra.steeringRelease??Infinity)){if(!driftTicks)driftEntrySpeed=speed*3.6;driftTicks++;driftExitSpeed=Math.hypot(body.linvel().x,body.linvel().z)*3.6;}
    peakYaw = Math.max(peakYaw, Math.abs(body.angvel().y));
    if (time > 0.5 && time < 2 && Math.abs(body.angvel().y) > 0.1) {
      radiusSum += speed / Math.abs(body.angvel().y); radiusSamples++;
    }
    if (speed > 3) peakSlip = Math.max(peakSlip, Math.abs(finalSlip));
    if (state.burnout) {
      burnoutSteps++; burnoutDistance = Math.hypot(body.translation().x - initial.x, body.translation().z - initial.z);
    }
    peakSpin = Math.max(peakSpin, ...state.wheelSlip);
    if (brake && speed < 0.3 && startSpeed > 0) break;
  }
  const p = body.translation(), v = body.linvel();
  const result = { mode, hz, time, dx: p.x - initial.x, dz: p.z - initial.z,
    distance: Math.hypot(p.x - initial.x, p.z - initial.z),
    endSpeed: Math.hypot(v.x, v.z) * 3.6, peakSpeed, peakYaw, peakSlip, finalSlip,
    burnoutSteps, burnoutDistance, peakSpin, meanRadius: radiusSum / Math.max(1, radiusSamples),
    wheelSpeeds: [...state.wheelSpeeds], mass: body.mass(),yawTravel,driftTicks,driftEntrySpeed,driftExitSpeed,nitroRemaining:state.nitro.remaining,
    steering:state.steering, assistTorqueCalls:assistTorque?.mock.calls.length??0 };
  assistTorque?.mockRestore();
  world.free();
  if (process.env.SPEEDRUNNER_BENCHMARK) appendFileSync(process.env.SPEEDRUNNER_BENCHMARK, JSON.stringify(result) + '\n');
  return result;
}

describe('Unified contact traction in real Rapier', () => {
  it.each(['tarmac','gravel'] as const)('lets every car countersteer and keep driving forward after a slide on %s', surface => {
    for(const car of Object.values(VEHICLE_REGISTRY)) {
      const result=scenario(car.stats.driveType,.8,0,.7,true,75,Infinity,60,8,car.config,false,0,0,
        {abs:true,tcs:true,esp:true,handbrakeRelease:.16,holdDriftAfter:.6,steeringRelease:2,countersteerOnRelease:true,surface,tire:surface==='gravel'?'gravel':'asphalt'});
      expect(Math.abs(result.finalSlip),car.id).toBeLessThan(.2);
      expect(result.endSpeed,car.id).toBeGreaterThan(40);
      expect(result.peakYaw,car.id).toBeLessThan(2.5);
    }
  });
  it('lets every chassis use the handbrake at highway speed without snap spins', () => {
    for (const car of Object.values(VEHICLE_REGISTRY)) {
      const left=scenario(car.stats.driveType,.65,0,.7,true,145,Infinity,60,6,car.config,false,0,0,
        {abs:true,tcs:true,esp:true,handbrakeRelease:.2,holdDriftAfter:.6,steeringRelease:2.5,countersteerOnRelease:true});
      const right=scenario(car.stats.driveType,.65,0,-.7,true,145,Infinity,60,6,car.config,false,0,0,
        {abs:true,tcs:true,esp:true,handbrakeRelease:.2,holdDriftAfter:.6,steeringRelease:2.5,countersteerOnRelease:true});
      expect(left.peakYaw,car.id).toBeLessThan(2);
      expect(left.peakSlip,car.id).toBeLessThan(.85);
      expect(Math.abs(left.finalSlip),car.id).toBeLessThan(.2);
      expect(Math.abs(left.dx+right.dx),car.id).toBeLessThan(1.5);
      expect(left.endSpeed,car.id).toBeGreaterThan(65);
    }
  });
  it.each([30,60,120])('holds then countersteers a released-wheel slide across every chassis at %s Hz', hz => {
    for (const car of Object.values(VEHICLE_REGISTRY)) {
      const result=scenario(car.stats.driveType,.8,0,.7,true,75,Infinity,hz,8,car.config,false,0,0,
        {abs:true,tcs:true,esp:true,handbrakeRelease:.16,holdDriftAfter:.6,steeringRelease:4,countersteerOnRelease:true});
      if (process.env.SPEED_FLEET_REPORT) appendFileSync(process.env.SPEED_FLEET_REPORT,JSON.stringify({test:'release-hold-countersteer',hz,id:car.id,result})+'\n');
      expect(result.driftTicks,car.id).toBeGreaterThan(hz*.8);
      expect(result.peakYaw,car.id).toBeLessThan(2.5);
      expect(result.peakSlip,car.id).toBeLessThan(.85);
      expect(Math.abs(result.finalSlip),car.id).toBeLessThan(.2);
      expect(result.endSpeed,car.id).toBeGreaterThan(50);
    }
  });
  it('uses all grounded wheel normals for NOS instead of the final wheel on a curb', () => {
    const thrust: Vector3[] = [];
    for (const curbWheel of [0,3]) {
      const world = new RAPIER.World({x:0,y:0,z:0});
      const config = createRoadVehicleConfig(STRADALE_GT_CONFIG);
      const body = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic());
      world.createCollider(RAPIER.ColliderDesc.cuboid(1,.3,2).setMass(config.chassisMass),body);
      const controller = world.createVehicleController(body);
      for (const w of config.wheels) controller.addWheel({x:w.position[0],y:w.position[1],z:w.position[2]},
        {x:0,y:-1,z:0},{x:-1,y:0,z:0},w.suspensionRestLength,w.radius);
      vi.spyOn(controller,'wheelIsInContact').mockReturnValue(true);
      vi.spyOn(controller,'wheelContactNormal').mockImplementation(i=>new Vector3(0,i===curbWheel?Math.SQRT1_2:1,i===curbWheel?Math.SQRT1_2:0));
      vi.spyOn(controller,'wheelContactPoint').mockImplementation(i=>new Vector3(config.wheels[i].position[0],-.5,config.wheels[i].position[2]));
      vi.spyOn(controller,'wheelSuspensionForce').mockReturnValue(config.chassisMass*9.81/4);
      const state = createContactTractionState();
      const input:InputState={throttle:0,brake:0,steering:0,handbrake:false,cameraToggle:false,reset:false,nitro:true};
      // Invalid simulation time must not consume fuel or apply even a tiny launch.
      for (const dt of [0,-1,NaN,Infinity]) applyContactTraction(body,controller,config,state,input,'AWD',1,false,'tarmac','asphalt',dt,false,false,true);
      expect(state.nitro.remaining).toBe(10);
      expect(body.linvel().z).toBe(0);
      applyContactTraction(body,controller,config,state,input,'AWD',1,false,'tarmac','asphalt',1/60,false,false,true);
      const v=body.linvel(); thrust.push(new Vector3(v.x,v.y,v.z).normalize());
      expect(state.nitro.remaining).toBeCloseTo(10-1/60);
      vi.restoreAllMocks(); world.free();
    }
    expect(thrust[0].distanceTo(thrust[1])).toBeLessThan(1e-6);
    expect(thrust[0].z).toBeGreaterThan(.98);
    expect(thrust[0].y).toBeLessThan(-.1);
    expect(thrust[0].y).toBeGreaterThan(-.25);
  });
  it.each([-1,1])('keeps baseline spin protection while optional ESP steering is disabled during a large BMW slide in direction %s', sign => {
    const config = VEHICLE_REGISTRY.bmw_m3_drift.config;
    const off = scenario('RWD', 0, 0, 0, false, 90, Infinity, 60, 1/60, config, false, sign, sign*.8, {esp:false,trackAssists:true});
    const on = scenario('RWD', 0, 0, 0, false, 90, Infinity, 60, 1/60, config, false, sign, sign*.8, {esp:true,trackAssists:true});
    expect(off.steering).toBe(0);
    expect(off.assistTorqueCalls).toBeGreaterThan(0);
    expect(Math.abs(on.steering)).toBeGreaterThan(.05);
    expect(on.assistTorqueCalls).toBeGreaterThan(0);
  });
  it.each(['FWD','AWD'] as const)('does not apply the BMW RWD drift recovery after changing to %s', mode => {
    const config = VEHICLE_REGISTRY.bmw_m3_drift.config;
    const result = scenario(mode, 0, 0, 0, false, 90, Infinity, 60, 1/60, config, false, 1, .8, {esp:true,trackAssists:true});
    // The universal spin catch remains, but BMW-specific full-lock steering does not.
    expect(Math.abs(result.steering)).toBeLessThan(.04);
    expect(result.assistTorqueCalls).toBeGreaterThan(0);
  });
  it.each([30,60,120])('settles one-degree BMW straight-line disturbances with ESP at %s Hz',hz=>{
    for(const heading of [-Math.PI/180,Math.PI/180]){
      const result=scenario('RWD',1,0,0,false,90,Infinity,hz,6,VEHICLE_REGISTRY.bmw_m3_drift.config,false,heading,.03*Math.sign(heading));
      if(process.env.SPEED_FLEET_REPORT)appendFileSync(process.env.SPEED_FLEET_REPORT,JSON.stringify({test:'straight-bmw',hz,heading,result})+'\n');
      expect(result.peakSlip).toBeLessThan(1.1*Math.PI/180);
      expect(Math.abs(result.finalSlip)).toBeLessThan(Math.PI/180);
      expect(result.peakYaw).toBeLessThan(.15);
      expect(result.driftTicks).toBe(0);
    }
  });
  it('launches NOS from zero even without accelerator pressure',()=>{
    for(const car of Object.values(VEHICLE_REGISTRY)){
      const result=scenario(car.stats.driveType,0,0,0,false,0,Infinity,60,2,car.config,false,0,0,{nitro:true});
      expect(result.endSpeed,car.id).toBeGreaterThan(40);
      expect(result.nitroRemaining,car.id).toBeCloseTo(8,1);
    }
  });
  it.each([30,60,120])('preserves gentle BMW steering instead of locking the heading at %s Hz',hz=>{
    const result=scenario('RWD',.5,0,.08,false,90,Infinity,hz,4,VEHICLE_REGISTRY.bmw_m3_drift.config);
    expect(result.yawTravel).toBeGreaterThan(.25);
    expect(result.peakSlip).toBeLessThan(2*Math.PI/180);
    expect(result.driftTicks).toBe(0);
  });
  it.each(Array.from({length:24},(_,index)=>({hz:[30,60,120][Math.floor(index/8)],mask:index%8})))('checks every car with assist mask $mask at $hz Hz',({hz,mask})=>{
    const assists={abs:Boolean(mask&1),tcs:Boolean(mask&2),esp:Boolean(mask&4)};
    for(const car of Object.values(VEHICLE_REGISTRY)){
      const normal=scenario(car.stats.driveType,1,0,0,false,0,Infinity,hz,3,car.config,false,0,0,assists);
      const boost=scenario(car.stats.driveType,1,0,0,false,0,Infinity,hz,3,car.config,false,0,0,{...assists,nitro:true});
      const stop=scenario(car.stats.driveType,0,1,0,false,90,Infinity,hz,6,car.config,false,Math.PI/180,0,{...assists,brakeToStop:true});
      if(process.env.SPEED_FLEET_REPORT)appendFileSync(process.env.SPEED_FLEET_REPORT,JSON.stringify({test:'assist-matrix',hz,mask,id:car.id,normal:normal.endSpeed,boost:boost.endSpeed,boostYaw:boost.peakYaw,boostWander:boost.dx,stop:stop.distance,stopped:stop.endSpeed})+'\n');
      expect(boost.endSpeed,car.id).toBeGreaterThan(normal.endSpeed+20);
      expect(boost.endSpeed,car.id).toBeLessThan(200);
      expect(boost.nitroRemaining,car.id).toBeCloseTo(7,1);
      expect(Math.abs(boost.dx),car.id).toBeLessThan(.1);
      expect(boost.peakYaw,car.id).toBeLessThan(.15);
      expect(stop.endSpeed,car.id).toBeLessThan(1);
      expect(stop.distance,car.id).toBeGreaterThan(10);
      expect(stop.distance,car.id).toBeLessThan(70);
      if(assists.esp){
        const straight=scenario(car.stats.driveType,1,0,0,false,90,Infinity,hz,6,car.config,false,Math.PI/180,.03,assists);
        expect(straight.peakSlip,car.id).toBeLessThan(1.1*Math.PI/180);
        expect(Math.abs(straight.finalSlip),car.id).toBeLessThan(Math.PI/180);
        expect(straight.peakYaw,car.id).toBeLessThan(.15);
      }
    }
  });
  it('uses finite fuel and applies NOS during braking, reversing and handbrake maneuvers',()=>{
    for(const car of Object.values(VEHICLE_REGISTRY)){
      const stop=scenario(car.stats.driveType,1,1,0,false,80,Infinity,60,4,car.config,false,0,0,{nitro:true});
      const reverse=scenario(car.stats.driveType,1,0,0,false,0,Infinity,60,3,car.config,true,0,0,{nitro:true});
      const handbrake=scenario(car.stats.driveType,1,0,0,true,0,Infinity,60,3,car.config,false,0,0,{nitro:true});
      expect(stop.nitroRemaining,car.id).toBeCloseTo(10-stop.time,5);expect(reverse.nitroRemaining,car.id).toBeCloseTo(7,5);expect(handbrake.nitroRemaining,car.id).toBeCloseTo(7,5);
      expect(reverse.dz,car.id).toBeLessThan(-5);expect(reverse.peakSpeed,car.id).toBeLessThan(25.5);
    }
  });
  it.each([0,1,2,3,4,5,6,7])('retains mirrored partial-throttle road corners with assist mask %s',mask=>{
    const assists={abs:Boolean(mask&1),tcs:Boolean(mask&2),esp:Boolean(mask&4)};
    for(const car of Object.values(VEHICLE_REGISTRY)){
      const left=scenario(car.stats.driveType,.3,0,.12,false,55,.8,60,4,car.config,false,0,0,assists);
      const right=scenario(car.stats.driveType,.3,0,-.12,false,55,.8,60,4,car.config,false,0,0,assists);
      if(process.env.SPEED_FLEET_REPORT)appendFileSync(process.env.SPEED_FLEET_REPORT,JSON.stringify({test:'assist-corner',mask,id:car.id,left,right})+'\n');
      expect(left.dx,car.id).toBeGreaterThan(0);expect(right.dx,car.id).toBeLessThan(0);
      expect(Math.abs(left.dx+right.dx),car.id).toBeLessThan(1);
      expect(left.peakYaw,car.id).toBeLessThan(2);
      expect(Math.abs(left.finalSlip),car.id).toBeLessThan(.25);
      expect(left.endSpeed,car.id).toBeGreaterThan(30);
    }
  });
  it.each([30,60,120])('holds a driver-controlled BMW drift and gains speed through wheel power at %s Hz',hz=>{
    const source=VEHICLE_REGISTRY.bmw_m3_drift.config;
    const result=scenario('RWD',.8,0,.55,true,70,Infinity,hz,8,source,false,0,0,{handbrakeRelease:.16,holdDriftAfter:.5,steeringRelease:4,countersteerOnRelease:true});
    if(process.env.SPEED_FLEET_REPORT)appendFileSync(process.env.SPEED_FLEET_REPORT,JSON.stringify({test:'sustained-drift',hz,result})+'\n');
    expect(result.driftTicks).toBeGreaterThan(hz*1.5);
    expect(result.driftExitSpeed).toBeGreaterThan(result.driftEntrySpeed+5);
    expect(result.peakYaw).toBeLessThan(3);
    expect(Math.abs(result.finalSlip)).toBeLessThan(.3);
    expect(result.endSpeed).toBeGreaterThan(60);
  });
  it('turns more tightly without scheduling an automatic full rotation',()=>{
    const source=VEHICLE_REGISTRY.bmw_m3_drift.config;
    const agile=scenario('RWD',.65,0,.18,false,70,Infinity,60,2,source);
    const limited=scenario('RWD',.65,0,.18,false,70,Infinity,60,2,{...source,powerSlide:{...source.powerSlide!,steeringSpeedReference:14}});
    expect(agile.yawTravel).toBeGreaterThan(limited.yawTravel*1.05);
    const sideways=scenario('RWD',0,0,0,false,90,Infinity,60,4,source,false,1.4,0);
    expect(Math.abs(sideways.yawTravel)).toBeLessThan(Math.PI);
  });
  it.each([30,60,120])('provides finite fuel and a real NOS acceleration gain for all fourteen cars at %s Hz',hz=>{
    for(const car of Object.values(VEHICLE_REGISTRY)){
      const normal=scenario(car.stats.driveType,1,0,0,false,140,Infinity,hz,5,car.config);
      const boost=scenario(car.stats.driveType,1,0,0,false,140,Infinity,hz,5,car.config,false,0,0,{nitro:true});
      if(process.env.SPEED_FLEET_REPORT)appendFileSync(process.env.SPEED_FLEET_REPORT,JSON.stringify({test:'nos',hz,id:car.id,normal:normal.endSpeed,boost:boost.endSpeed,remaining:boost.nitroRemaining})+'\n');
      expect(boost.endSpeed,car.id).toBeGreaterThan(normal.endSpeed+3);
      expect(boost.nitroRemaining,car.id).toBeCloseTo(5,1);
      expect(Math.abs(boost.dx),car.id).toBeLessThan(.1);
    }
  });
  it('keeps the rebalanced fleet quick while adding real weight and handling tradeoffs', () => {
    const baseline = scenario('AWD',1,0,0,false,0,Infinity,60,10);
    for (const preset of SPEED_FLEET) {
      const result = scenario(preset.stats.driveType,1,0,0,false,0,Infinity,60,10,preset.config);
      expect(result.endSpeed, preset.id).toBeGreaterThan(baseline.endSpeed * 1.02);
      expect(Math.abs(result.dx), preset.id).toBeLessThan(.1);
      if (process.env.SPEED_FLEET_REPORT) appendFileSync(process.env.SPEED_FLEET_REPORT, JSON.stringify({id:preset.id,baseline:baseline.endSpeed,speedAfter10s:result.endSpeed})+'\n');
    }
  });
  it('gives the BMW road speed, controllable power slides and finite recovery at three tick rates',()=>{
    const source=VEHICLE_REGISTRY.bmw_m3_drift.config;
    for(const hz of [30,60,120]){
      const road=scenario('RWD',1,0,0,false,0,Infinity,hz,10,source);
      const slide=scenario('RWD',.7,0,.8,true,70,.6,hz,6,source);
      if(process.env.SPEED_FLEET_REPORT)appendFileSync(process.env.SPEED_FLEET_REPORT,JSON.stringify({id:'bmw_m3_drift',hz,road,slide})+'\n');
      expect(road.endSpeed).toBeGreaterThan(125);
      expect(slide.peakSlip).toBeGreaterThan(.2);expect(slide.peakYaw).toBeLessThan(3);
      expect(slide.endSpeed).toBeGreaterThan(30);expect(Math.abs(slide.finalSlip)).toBeLessThan(.5);
      if(process.env.SPEED_FLEET_REPORT)appendFileSync(process.env.SPEED_FLEET_REPORT,JSON.stringify({id:'bmw_m3_drift',hz,road,slide})+'\n');
    }
  });
  it('keeps heavy-car braking within a close but distinct range of the drift coupe',()=>{
    const bmw=scenario('RWD',0,1,0,false,100,Infinity,60,6,VEHICLE_REGISTRY.bmw_m3_drift.config);
    for(const id of ['voltline_xr','parcel_gt','ironclad_sprint']){
      const preset=VEHICLE_REGISTRY[id],stop=scenario(preset.stats.driveType,0,1,0,false,100,Infinity,60,6,preset.config);
      expect(stop.distance,id).toBeGreaterThan(bmw.distance*1.01);expect(stop.distance,id).toBeLessThan(bmw.distance*1.15);expect(stop.endSpeed,id).toBeLessThan(1);
      if(process.env.SPEED_FLEET_REPORT)appendFileSync(process.env.SPEED_FLEET_REPORT,JSON.stringify({id,brakingDistance:stop.distance,bmwDistance:bmw.distance})+'\n');
    }
  });
  it('launches every car decisively in reverse with all three assists enabled',()=>{
    for(const preset of Object.values(VEHICLE_REGISTRY))for(const mode of ['FWD','RWD','AWD'] as const){
      const result=scenario(mode,0,1,0,false,0,Infinity,60,2,preset.config,false,0,0,{abs:true,tcs:true,esp:true});
      expect(result.endSpeed,preset.id+mode).toBeGreaterThan(19);expect(result.peakYaw,preset.id+mode).toBeLessThan(.1);
    }
  });
  it.each([30, 60, 120])('limits automatic reverse across all chassis and drive axles at %s Hz', hz => {
    for (const preset of Object.values(VEHICLE_REGISTRY)) {
      for (const mode of ['FWD', 'RWD', 'AWD'] as const) {
        const result = scenario(mode, 0, 1, 0, false, 0, Infinity, hz, 20, preset.config);
        expect(result.dz, preset.id + mode).toBeLessThan(-20);
        expect(result.peakSpeed, preset.id + mode).toBeLessThanOrEqual(25.5);
      }
    }
  });
  it('uses the accelerator in manual reverse and the brake stops backing up', () => {
    const reverse = scenario('AWD', 1, 0, 0, false, 0, Infinity, 60, 20, STRADALE_GT_CONFIG, true);
    expect(reverse.dz).toBeLessThan(-20);
    expect(reverse.endSpeed).toBeLessThanOrEqual(25.5);
    const stop = scenario('AWD', 0, 1, 0, false, -25, Infinity, 60, 3, STRADALE_GT_CONFIG, true);
    expect(stop.endSpeed).toBeLessThan(1);
    expect(stop.dz).toBeGreaterThan(-12);
  });
  it('launches with genuine drive axle differences and kilogram-based mass', () => {
    const front = scenario('FWD', 1, 0), rear = scenario('RWD', 1, 0), all = scenario('AWD', 1, 0);
    for (const result of [front, rear, all]) {
      expect(result.mass).toBeGreaterThan(1000); expect(result.endSpeed).toBeGreaterThan(55);
      expect(Math.abs(result.dx)).toBeLessThan(0.1);
    }
    expect(all.endSpeed).toBeGreaterThan(front.endSpeed + 3);
    expect(all.endSpeed).toBeGreaterThan(rear.endSpeed + 3);
  });
  it('brakes from 80 km/h and ignores throttle overlap, at 30/60/120 Hz', () => {
    const results = [30, 60, 120].map(hz => scenario('AWD', 0, 1, 0, false, 80, Infinity, hz));
    for (const result of results) { expect(result.distance).toBeGreaterThan(20); expect(result.distance).toBeLessThan(36); }
    expect(Math.max(...results.map(r => r.distance)) - Math.min(...results.map(r => r.distance))).toBeLessThan(2);
    const overlap = scenario('AWD', 1, 1, 0, false, 80);
    expect(overlap.distance).toBeCloseTo(results[1].distance, 1);
  });
  it.each(['FWD', 'RWD', 'AWD'] as const)('%s holds burnouts with spinning drive wheels then launches on release', mode => {
    const hold = scenario(mode, 1, 0, 0, true, 0);
    expect(hold.burnoutSteps).toBeGreaterThan(250); expect(hold.distance).toBeLessThan(0.5);
    expect(hold.peakSpin).toBeGreaterThan(15);
    if (mode === 'FWD') { expect(hold.wheelSpeeds[0]).toBeGreaterThan(15); expect(hold.wheelSpeeds[2]).toBeLessThan(1); }
    if (mode === 'RWD') { expect(hold.wheelSpeeds[2]).toBeGreaterThan(15); expect(hold.wheelSpeeds[0]).toBeLessThan(1); }
    const launch = scenario(mode, 1, 0, 0, true, 0, 2);
    expect(launch.burnoutDistance).toBeLessThan(0.5); expect(launch.endSpeed).toBeGreaterThan(45);
  });
  it.each(['FWD', 'RWD', 'AWD'] as const)('%s mirrors handbrake slides and recovers without spin-out', mode => {
    const left = scenario(mode, 0.65, 0, 0.75, true, 50, 2,60,6,STRADALE_GT_CONFIG,false,0,0,{countersteerOnRelease:true});
    const right = scenario(mode, 0.65, 0, -0.75, true, 50, 2,60,6,STRADALE_GT_CONFIG,false,0,0,{countersteerOnRelease:true});
    expect(left.dx).toBeGreaterThan(0); expect(right.dx).toBeLessThan(0);
    expect(Math.abs(left.dx + right.dx)).toBeLessThan(1.5);
    expect(Math.abs(left.dz - right.dz)).toBeLessThan(1.5);
    expect(left.peakYaw).toBeLessThan(2.5); expect(Math.abs(left.finalSlip)).toBeLessThan(0.2);
  });
  it('gives torque routing distinct cornering radii under identical inputs', () => {
    const turns = (['FWD', 'RWD', 'AWD'] as const).map(mode => scenario(mode, 0.8, 0, 0.6, true, 45, Infinity, 60, 2));
    const radii = turns.map(result => result.meanRadius);
    expect(Math.max(...radii) - Math.min(...radii)).toBeGreaterThan(1.5);
    for (const turn of turns) { expect(turn.meanRadius).toBeGreaterThan(3); expect(turn.peakYaw).toBeLessThan(2.5); }
    for (const turn of turns) { expect(turn.endSpeed).toBeGreaterThan(20); expect(turn.peakSlip).toBeLessThan(0.85); }
  });
  it('keeps every registered chassis stable with the replacement solver', () => {
    for (const preset of Object.values(VEHICLE_REGISTRY)) {
      const stop = scenario('AWD', 0, 1, 0, false, 80, Infinity, 60, 6, preset.config);
      const left = scenario('AWD', 0.65, 0, 0.7, true, 50, 2, 60, 6, preset.config,false,0,0,{countersteerOnRelease:true});
      const right = scenario('AWD', 0.65, 0, -0.7, true, 50, 2, 60, 6, preset.config,false,0,0,{countersteerOnRelease:true});
      expect(stop.distance, preset.id).toBeGreaterThan(20); expect(stop.distance, preset.id).toBeLessThan(36);
      expect(left.peakYaw, preset.id).toBeLessThan(2.5);
      expect(Math.abs(left.finalSlip), preset.id).toBeLessThan(0.2);
      expect(Math.abs(left.dx + right.dx), preset.id).toBeLessThan(1.5);
    }
  });
  it('keeps tires passive in the air but supplies deliberate fuel-limited NOS thrust', () => {
    const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
    const config = createRoadVehicleConfig(STRADALE_GT_CONFIG);
    const body = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(0, 10, 0));
    world.createCollider(RAPIER.ColliderDesc.cuboid(1, .3, 2).setMass(config.chassisMass), body);
    const controller = world.createVehicleController(body);
    for (const w of config.wheels) controller.addWheel({ x: w.position[0], y: w.position[1], z: w.position[2] },
      { x: 0, y: -1, z: 0 }, { x: -1, y: 0, z: 0 }, w.suspensionRestLength, w.radius);
    configureContactSuspension(controller, config);
    const state = createContactTractionState();
    const input: InputState = { throttle: 1, brake: 0, steering: 1, handbrake: true, cameraToggle: false, reset: false };
    for (let i = 0; i < 240; i++) {
      controller.updateVehicle(1 / 60);
      applyContactTraction(body, controller, config, state, input, 'RWD', 1, false, 'tarmac', 'asphalt', 1 / 60, true, true, true);
      world.step();
    }
    expect(body.translation().x).toBeCloseTo(0); expect(body.translation().z).toBeCloseTo(0);
    expect(body.angvel().y).toBeCloseTo(0); expect(state.burnout).toBe(false);
    input.nitro=true;input.handbrake=false;
    for(let i=0;i<120;i++){
      controller.updateVehicle(1/60);
      applyContactTraction(body,controller,config,state,input,'RWD',1,false,'tarmac','asphalt',1/60,true,true,true);
      world.step();
    }
    expect(state.nitro.remaining).toBeCloseTo(8,5);expect(state.nitro.active).toBe(true);
    expect(body.linvel().x).toBeCloseTo(0);expect(body.linvel().z).toBeGreaterThan(5);world.free();
  });
});




it.each(Object.values(VEHICLE_REGISTRY).map(car=>[car.id,car.config] as const))('catches a severe slide without a full rotation in %s',(_id,config)=>{
 for(const mode of ['FWD','AWD','RWD'] as const)for(const hz of [30,60,120])for(const sign of [-1,1]){
  const result=scenario(mode,.5,0,0,false,90,Infinity,hz,4,config,false,sign*1.1,sign*2.5,{esp:false});
  expect(Math.abs(result.yawTravel)).toBeLessThan(Math.PI);expect(Math.abs(result.finalSlip)).toBeLessThan(.65);expect(result.endSpeed).toBeGreaterThan(5);
 }
});

