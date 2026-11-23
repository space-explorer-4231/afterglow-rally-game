import { Quaternion, Vector3 } from 'three';
import { DEFAULT_CONTACT_PROFILE } from '@/config/vehicles/contactProfiles';
import type { RapierRigidBody } from '@react-three/rapier';
import type { DynamicRayCastVehicleController } from '@dimforge/rapier3d-compat';
import type { VehicleConfig, SurfaceType, TireType } from '@/types/vehicle';
import type { InputState } from '@/types/game';
import type { DrivetrainMode } from '@/types/settings';
import { getSurfaceDefinition } from '@/config/surfaceRegistry';
import { getTireDefinition } from '@/config/tireRegistry';
import { REVERSE_MAX_SPEED, REVERSE_FORCE_MULTIPLIER } from '@/config/vehicle';
import { clamp } from '@/utils/math';
import {createNitroState,advanceNitro,NITRO_TORQUE_MULTIPLIER,NITRO_SPEED_MULTIPLIER,nitroAcceleration} from './nitro';
import {straightLineAssistBlend} from './straightLineAssist';
import {spinCatchImpulse} from './spinCatch';
import { advanceDriftAngleControl, createDriftAngleControl, driftControlYaw, driftRecoveryBlend } from './driftAngleControl';
import { DRIFT_ANGLE_CONTROL } from '@/config/physicsBalance';

/** Persistent contact state. All buffers are allocated only when the car mounts. */
export function createContactTractionState() {
  return {
    steering: 0, handbrakeTime: 0, burnout: false, absActive: false, tcsActive: false,
    espActive: false, previousForward: 0, previousLateral: 0, acceleration: 0,
    driftPower:0,nitro:createNitroState(),nitroCountdown:false, driftControl: createDriftAngleControl(),
    wheelSpeeds: new Float32Array(4), wheelSlip: new Float32Array(4),
    loads: new Float32Array(4), grips: [1, 1, 1, 1],
    quaternion: new Quaternion(), inverse: new Quaternion(),
    velocity: new Vector3(), angular: new Vector3(), local: new Vector3(),
    point: new Vector3(), arm: new Vector3(), contactVelocity: new Vector3(),
    forward: new Vector3(), lateral: new Vector3(), normal: new Vector3(), groundNormal: new Vector3(), impulse: new Vector3(),
  };
}
export type ContactTractionState = ReturnType<typeof createContactTractionState>;

/** Smooth tire breakaway with a retained sliding plateau, rather than ice-like zero grip. */
export function tireSlipCoefficient(slip: number): number {
  const x = Math.abs(slip);
  return x < 0.12 ? Math.sin(Math.atan(12 * x) * 1.35)
    : 0.77 + 0.23 * Math.exp(-(x - 0.12) * 2.6);
}

/** Configure Rapier as a suspension/contact provider; traction is solved exactly once below. */
export function configureContactSuspension(controller: DynamicRayCastVehicleController, config: VehicleConfig): void {
  for (let i = 0; i < 4; i++) {
    const w = config.wheels[i];
    controller.setWheelEngineForce(i, 0);
    controller.setWheelBrake(i, 0);
    controller.setWheelFrictionSlip(i, 0);
    controller.setWheelSideFrictionStiffness(i, 0);
    controller.setWheelMaxSuspensionForce(i, config.chassisMass * 9.81 * 1.8);
    controller.setWheelSuspensionStiffness(i, w.suspensionStiffness);
  }
}

/** Load-sensitive combined-slip contact solver, with a bounded physical line-lock burnout.
 * Call after updateVehicle(), before world.step(). No velocity/position overrides are used.
 */
export function applyContactTraction(
  body: RapierRigidBody, controller: DynamicRayCastVehicleController, config: VehicleConfig,
  state: ContactTractionState, input: InputState, mode: DrivetrainMode,
  gear: number, manual: boolean, surface: SurfaceType, tire: TireType,
  dtRaw: number, abs: boolean, tcs: boolean, esp: boolean, powerScale = 1,
): void {
  // A stopped/invalid clock must not invent a tire impulse or consume NOS.
  if (!Number.isFinite(dtRaw) || dtRaw <= 0) return;
  const dt = clamp(dtRaw, 1 / 240, 1 / 30);
  const mass = body.mass();
  const rotation = body.rotation();
  state.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
  state.inverse.copy(state.quaternion).invert();
  const velocity = body.linvel(); const angular = body.angvel(); const position = body.translation();
  state.velocity.set(velocity.x, velocity.y, velocity.z);
  state.angular.set(angular.x, angular.y, angular.z);
  state.local.copy(state.velocity).applyQuaternion(state.inverse);
  const vf = state.local.z, vl = state.local.x, speed = Math.hypot(vf, vl);
  state.arm.copy(state.angular).applyQuaternion(state.inverse);
  const bodyYaw = state.arm.y;
  // Rotating-frame derivative: turning the chassis must not masquerade as braking/load transfer.
  const acceleration = clamp((vf - state.previousForward) / dt - bodyYaw * vl, -12, 12);
  state.acceleration += (acceleration - state.acceleration) * (1 - Math.exp(-dt * 8));
  const lateralAcceleration = clamp((vl - state.previousLateral) / dt + bodyYaw * vf, -12, 12);
  state.previousForward = vf; state.previousLateral = vl;
  state.handbrakeTime = input.handbrake ? state.handbrakeTime + dt : 0;
  let contacts = 0;
  for (let i = 0; i < 4; i++) if (controller.wheelIsInContact(i)) contacts++;
  state.burnout = contacts >= 3 && input.handbrake && input.throttle > 0.35 && input.brake < 0.1
    && gear > 0 && speed < (state.burnout ? 2.2 : 1.2);
  state.absActive = false; state.tcsActive = false; state.espActive = false;
  // Digital steering is speed-sensitive; physical front tire forces provide yaw.
  const profile = config.contactHandling ?? DEFAULT_CONTACT_PROFILE;
  const limit = profile.steeringLock / (1 + Math.pow(speed / (config.powerSlide?.steeringSpeedReference??14), 1.35));
  const slipAngle = Math.atan2(vl, Math.max(2, Math.abs(vf)));
  const fullSlip=Math.atan2(vl,vf);
  const upright=1-2*(rotation.x*rotation.x+rotation.z*rotation.z)>.7;
  const driveEligible=gear>0&&contacts>=3&&upright&&!state.burnout&&input.brake<.1&&input.throttle>.2;
  advanceDriftAngleControl(state.driftControl, input.steering, fullSlip, input.handbrake,
    esp && gear > 0 && contacts >= 3 && upright && !state.burnout && input.brake < .1
      && input.throttle > .1 && vf > 4 && speed > 7, dt, mode !== 'FWD');
  const straightBlend=esp&&contacts>=3&&upright&&gear>0?straightLineAssistBlend(input.steering*limit,fullSlip,input.handbrake):0;
  const controlledSlide=config.powerSlide&&mode==='RWD'&&driveEligible&&vf>3&&speed>8&&speed<55
    ?clamp((Math.abs(fullSlip)-.12)/.2,0,1)*clamp((1.05-Math.abs(fullSlip))/.35,0,1):0;
  state.driftPower+=(controlledSlide-state.driftPower)*(1-Math.exp(-4*dt));
  const nitroEligible=true;
  const nitroFlow=advanceNitro(state.nitro,Boolean(input.nitro),nitroEligible,dt);
  const countersteer = esp && !state.burnout
    ? clamp(slipAngle * (mode === 'RWD' ? profile.countersteer : .5), mode === 'RWD' ? -.5 : -.18, mode === 'RWD' ? .5 : .18) : 0;
  const recoveryBlend=esp&&config.powerSlide&&mode==='RWD'&&contacts>=3&&upright&&speed>8&&vf>0?clamp((Math.abs(fullSlip)-.65)/.4,0,1):0;
  let desiredSteering = clamp((input.steering * limit + countersteer)*(1-recoveryBlend)+Math.sign(fullSlip)*profile.steeringLock*recoveryBlend, -profile.steeringLock, profile.steeringLock);
  const reverseThrottle = !manual && gear === -1 && vf < 0.8;
  const throttle = gear === 0 ? 0 : (reverseThrottle ? input.brake : input.throttle);
  const brake = reverseThrottle ? input.throttle : input.brake;
  const direction = gear === -1 ? -1 : 1;
  // Wheel torque follows gear reduction, torque taper and maximum road speed.
  const ratio = gear === -1 ? 3 : gear <= 1 ? 3.2 : gear === 2 ? 2.15 : gear === 3 ? 1.55 : gear === 4 ? 1.16 : 0.9;
  const slideTorque=1+((config.powerSlide?.torqueMultiplier??1)-1)*state.driftPower;
  const engineTorque = 360 * (gear>0?1+.1*throttle*throttle:1) * clamp(config.engine.maxForce / 440, 0.65, 2.4)*slideTorque*(1+(NITRO_TORQUE_MULTIPLIER-1)*nitroFlow);
  const speedLimit = gear === -1 ? REVERSE_MAX_SPEED / 3.6 : Math.max(30, config.engine.maxSpeed / 3.6)*1.08*(1+(NITRO_SPEED_MULTIPLIER-1)*nitroFlow);
  const engineForce = engineTorque * ratio * 3.6 * 0.88 / config.wheels[0].radius
    * throttle * direction * (gear === -1 ? REVERSE_FORCE_MULTIPLIER : 1) * (brake > 0.1 ? 0 : 1) * clamp(1 - Math.pow(speed / speedLimit, 4), 0, 1) * powerScale;
  const frontDrive = mode === 'FWD' ? 1 : mode === 'RWD' ? 0 : clamp(config.drivetrain.frontBias,.15,.85);
  const surfaceDef = getSurfaceDefinition(surface);
  const mu = clamp(surfaceDef.tireModel.front.baseGrip / 2.1, 0.35, 1.15)
    * 1.08 * getTireDefinition(tire).surfaceGripMultipliers[surface];
  const frontZ = config.wheels[0].position[2], rearZ = config.wheels[2].position[2];
  const wheelbase = Math.max(1.5, frontZ - rearZ), halfTrack = Math.abs(config.wheels[0].position[0]);
  const slideYaw = driftControlYaw(state.driftControl.target, fullSlip, speed, mu);
  const recoveryGrip = state.driftControl.recovering ? 1
    : state.driftControl.active ? driftRecoveryBlend(state.driftControl.target, input.steering, input.handbrake) : 0;
  if (state.driftControl.active) {
    const settledYaw = slideYaw + (slideYaw - bodyYaw) * DRIFT_ANGLE_CONTROL.yawFeedback;
    desiredSteering = clamp(fullSlip + Math.atan2(wheelbase * settledYaw, Math.max(4, vf)), -profile.steeringLock, profile.steeringLock);
  }
  state.steering += (desiredSteering - state.steering) * (1 - Math.exp(-dt * profile.steeringResponse));
  const frontBias = clamp((-rearZ + (config.weightDistribution?.centerOfMassZ ?? 0)) / wheelbase, 0.4, 0.65);
  const transfer = mass * state.acceleration * 0.48 / wheelbase;
  state.local.copy(state.angular).applyQuaternion(state.inverse);
  const yawRate = state.local.y;
  const yawReference = state.driftControl.active ? slideYaw : clamp(vf * Math.tan(mode === 'RWD' ? input.steering * limit : state.steering) / wheelbase,
    -9.81 * mu / Math.max(3, speed), 9.81 * mu / Math.max(3, speed));
  // ESP uses selective braking at the contacts; it never rotates or propels the chassis directly.
  const yawError = yawRate - yawReference;
  // Drift mode keeps its countersteer/yaw guard but avoids braking away every
  // controlled power slide. Selective braking returns progressively above 35°.
  const driftBrakeReserve=state.driftControl.recovering ? 1
    : state.driftControl.active ? DRIFT_ANGLE_CONTROL.selectiveBrakeReserve
      : config.powerSlide&&mode==='RWD'&&driveEligible?clamp((Math.abs(fullSlip)-.6)/.35,0,1):1;
  const yawBrake = esp && speed > 3 && Math.abs(yawError) > 0.12
    ? clamp(Math.abs(yawError) * mass * wheelbase * 2.4 * profile.stability, 0, mass * 9.81 * 0.45)*driftBrakeReserve : 0;
  state.groundNormal.set(0, 0, 0);
  for (let i = 0; i < 4; i++) {
    const w = config.wheels[i], front = w.steerable;
    const driveFraction = (front ? frontDrive : 1 - frontDrive) * 0.5;
    const steer = front ? state.steering : 0;
    controller.setWheelSteering(i, steer);
    if (!controller.wheelIsInContact(i)) {
      state.loads[i] = 0; state.grips[i] = 0; state.wheelSlip[i] = 0;
      state.wheelSpeeds[i] += (throttle * direction * 32 * driveFraction - state.wheelSpeeds[i]) * dt * 3;
      continue;
    }
    const contact = controller.wheelContactPoint(i), normal = controller.wheelContactNormal(i);
    if (!contact || !normal) continue;
    state.point.set(contact.x, contact.y, contact.z);
    state.normal.set(normal.x, normal.y, normal.z);
    state.groundNormal.add(state.normal);
    state.arm.set(contact.x - position.x, contact.y - position.y, contact.z - position.z);
    state.contactVelocity.crossVectors(state.angular, state.arm).add(state.velocity);
    state.forward.set(Math.sin(steer), 0, Math.cos(steer)).applyQuaternion(state.quaternion);
    state.forward.addScaledVector(state.normal, -state.forward.dot(state.normal)).normalize();
    state.lateral.crossVectors(state.normal, state.forward).normalize();
    const longitudinal = state.contactVelocity.dot(state.forward);
    const lateral = state.contactVelocity.dot(state.lateral);
    const staticLoad = mass * 9.81 * (front ? frontBias : 1 - frontBias) * 0.5;
    const lateralTransfer = mass * lateralAcceleration * 0.48 / Math.max(1.2, 2 * halfTrack) * 0.5;
    const estimatedLoad = staticLoad + (front ? -transfer : transfer) * 0.5
      + (w.position[0] > 0 ? -lateralTransfer : lateralTransfer);
    const measuredLoad = Math.max(0, controller.wheelSuspensionForce(i) ?? staticLoad);
    // Filter load transfer with actual raycast compression; prevent landing spikes exceeding tire capacity.
    const load = clamp(estimatedLoad * 0.65 + measuredLoad * 0.35, staticLoad * 0.12, staticLoad * 2.5);
    state.loads[i] = load;
    const loadSensitivity = Math.pow(Math.max(0.1, load / staticLoad), -0.08);
    const rallyRearSupport=!front&&mode==='RWD'&&esp&&surface!=='tarmac'?1.25:1;
    const capacity = load * mu * loadSensitivity * (front ? profile.frontGrip : profile.rearGrip)*rallyRearSupport;
    let demand = engineForce * driveFraction;
    if (esp && !state.burnout) {
      // Preserve steering reserve at the driven tires. RWD retains more wheelspin/oversteer than AWD/FWD.
      const tractionReserve = surface==='tarmac'
        ?(mode==='RWD'?.74+state.driftPower*.12:mode==='FWD'?.8:.88)
        :(mode==='RWD'?.54+state.driftPower*.12:mode==='FWD'?.72:.8);
      const cornerDemand = Math.abs(input.steering) + Math.abs(slipAngle) * 1.5;
      const limit = capacity * (1 - clamp(cornerDemand, 0, 1) * (1 - tractionReserve));
      demand = clamp(demand, -limit, limit);
    }
    if (tcs && !input.handbrake && Math.abs(demand) > capacity * 0.85) {
      demand = Math.sign(demand) * capacity * 0.85; state.tcsActive = true;
    }
    // A short rear lock initiates a slide; holding Space beyond entry releases the lock progressively.
    const handbrakeLock = input.handbrake && !front && !state.burnout
      ? (state.handbrakeTime < 0.16 ? 0.85 : 0.08) : 0;
    const longitudinalLimit = capacity * (state.burnout && driveFraction > 0 ? 0.38 : 1);
    let fx = clamp(demand, -longitudinalLimit, longitudinalLimit);
    const slipDemand = Math.max(0, Math.abs(demand) / Math.max(1, capacity) - 0.85);
    const spinningSpeed = Math.sign(demand) * Math.min(38, slipDemand * 7 + (state.burnout ? 22 : 0));
    const targetWheelSpeed = handbrakeLock > 0.7 ? 0 : longitudinal + spinningSpeed;
    state.wheelSpeeds[i] += (targetWheelSpeed - state.wheelSpeeds[i]) * (1 - Math.exp(-dt * 12));
    state.wheelSlip[i] = Math.abs(state.wheelSpeeds[i] - longitudinal);
    const brakeBias = front ? 0.64 : 0.36;
    let brakeForce = brake * mass * 11 * brakeBias * 0.5 * profile.brakeStrength + handbrakeLock * capacity;
    if (state.burnout) {
      // Brake-hold reaction at the tire contact balances wheel thrust, while excess torque spins rubber.
      const brakeReaction = clamp(fx + longitudinal * mass * 0.25 / dt, -capacity, capacity);
      fx -= brakeReaction;
    } else if (brakeForce > 0) {
      if (abs && brake > 0.3 && Math.abs(longitudinal) > 2) state.absActive = true;
      if (!abs && brake > 0.7) brakeForce = Math.min(brakeForce, capacity * 0.78);
      fx -= clamp(longitudinal * mass * 0.25 / dt, -brakeForce, brakeForce);
    } else if (throttle < 0.05&&nitroFlow===0) {
      fx -= clamp(longitudinal * mass * 0.25 / dt, -capacity * 0.018, capacity * 0.018);
    }
    if (yawBrake > 0 && !state.burnout && longitudinal > 1
      && Math.sign(w.position[0]) === -Math.sign(yawError)) {
      fx -= Math.min(yawBrake * 0.5, capacity * 0.7);
      state.espActive = true;
    }
    fx = clamp(fx, -capacity, capacity);
    const wheelSlipAngle = Math.atan2(lateral, Math.max(2.5, Math.abs(longitudinal)));
    const lateralBudget = Math.sqrt(Math.max(0, capacity * capacity - fx * fx));
    const spinGrip = state.burnout && driveFraction > 0 ? 0.4 : 1 / (1 + slipDemand * 0.5);
    const lockedGrip = handbrakeLock > 0 ? 1 - handbrakeLock * 0.65 : 1;
    const driftBlend = !front && !state.burnout && state.driftControl.active
      ? clamp(Math.abs(state.driftControl.target)/.18,0,1)
      : !front && (mode !== 'FWD' || input.handbrake) && !state.burnout && speed > 7 && throttle > .2
        ? clamp((Math.abs(slipAngle)-.06)/.25,0,1) * clamp(((config.powerSlide?1.05:1.3)-Math.abs(slipAngle))/(config.powerSlide?.4:.35),0,1) : 0;
    const assistedRearGrip = state.driftControl.recovering ? 1
      : state.driftControl.active ? Math.min(profile.driftRearGrip, mode === 'RWD' ? DRIFT_ANGLE_CONTROL.rearGripRwd : DRIFT_ANGLE_CONTROL.rearGripOther) : profile.driftRearGrip;
    const slideRearGrip=surface==='tarmac'?assistedRearGrip:Math.max(.82,assistedRearGrip);
    const driftGrip = 1 + (slideRearGrip-1)*driftBlend*(1-recoveryGrip);
    let fy = -Math.sign(lateral) * lateralBudget * tireSlipCoefficient(wheelSlipAngle) * spinGrip * lockedGrip * driftGrip;
    // Adherent low-speed friction cannot reverse contact slip within one step.
    fy = clamp(fy, -Math.abs(lateral) * mass * 0.22 / dt, Math.abs(lateral) * mass * 0.22 / dt);
    state.grips[i] = spinGrip * lockedGrip * mu;
    state.impulse.copy(state.forward).multiplyScalar(fx * dt).addScaledVector(state.lateral, fy * dt);
    body.applyImpulseAtPoint(state.impulse, state.point, true);
  }
  // Deliberate, fuel-limited arcade NOS thrust. Unlike the removed drift booster it
  // acts along the nose only while the driver holds NOS, never along a spin trajectory.
  if(nitroFlow>0){
    // Use the whole contact patch on cambers/curbs. Selecting the last wheel's
    // normal made thrust direction depend on wheel iteration order.
    state.groundNormal.normalize();
    state.forward.set(0,0,1).applyQuaternion(state.quaternion);
    state.forward.addScaledVector(state.groundNormal,-state.forward.dot(state.groundNormal)).normalize();
    state.impulse.copy(state.forward).multiplyScalar(mass*nitroAcceleration(speed,speedLimit)*nitroFlow*dt*direction);
    body.applyImpulse(state.impulse,true);
  }
  // Near-straight ESP removes only yaw beyond the driver's requested turn.
  // It never adds a turn or redirects velocity, and fades before a drift.
  if(straightBlend>0&&speed>3&&!state.burnout&&!state.driftControl.active){
    const inertia=mass*(config.chassisSize[0]**2+config.chassisSize[2]**2)/12;
    const yawExcess=bodyYaw-clamp(bodyYaw,Math.min(0,yawReference),Math.max(0,yawReference));
    state.impulse.set(0,-yawExcess*inertia*(1-Math.exp(-5*straightBlend*dt)),0).applyQuaternion(state.quaternion);
    body.applyTorqueImpulse(state.impulse,true);
    if(Math.abs(yawExcess)>.01)state.espActive=true;
  }
  // Arcade safety net is independent of optional ESP; ordinary drift angles remain physical.
  if(contacts>=2&&upright&&gear>0&&!state.burnout){
    const inertia=mass*(config.chassisSize[0]**2+config.chassisSize[2]**2)/12;
    const catchImpulse=spinCatchImpulse(fullSlip,bodyYaw,speed,inertia,dt);
    if(catchImpulse){state.impulse.set(0,catchImpulse,0).applyQuaternion(state.quaternion);body.applyTorqueImpulse(state.impulse,true);state.espActive=true;}
  }
  // Progressive damping only removes excess yaw. It never adds a turn, picks a
  // destination heading or locks the car into a scripted spin.
  if(esp&&config.powerSlide&&mode==='RWD'&&contacts>=3&&upright&&gear>0&&speed>6&&!state.burnout&&!state.driftControl.active){
    const ceiling=Math.max(.55,9.81*mu/Math.max(6,speed)*1.35);
    const releaseBlend=clamp(1-Math.abs(input.steering)/.2,0,1)*clamp(Math.abs(fullSlip)/.18,0,1);
    const excess=(bodyYaw-clamp(bodyYaw,-ceiling,ceiling))*(1-releaseBlend)+bodyYaw*releaseBlend;
    const inertia=mass*(config.chassisSize[0]**2+config.chassisSize[2]**2)/12;
    state.impulse.set(0,-excess*inertia*(1-Math.exp(-config.powerSlide.yawDamping*dt))*Math.max(releaseBlend,clamp((Math.abs(fullSlip)-.22)/.4,0,1)),0).applyQuaternion(state.quaternion);
    body.applyTorqueImpulse(state.impulse,true);
  }
}

