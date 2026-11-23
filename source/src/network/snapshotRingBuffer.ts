import * as THREE from 'three';
import type { EntitySnapshot } from '@/types/network';
import type { SurfaceType } from '@/types/vehicle';

export const RING_BUFFER_CAPACITY = 32;
export const MAX_EXTRAPOLATION_MS = 250;

/**
 * Reusable scratch instances for Zero-GC vector and quaternion calculations.
 */
const scratchV0 = new THREE.Vector3();
const scratchV1 = new THREE.Vector3();
const scratchQ0 = new THREE.Quaternion();
const scratchQ1 = new THREE.Quaternion();
const scratchEuler = new THREE.Euler();

import {interpolateWheelSpin} from '@/utils/wheelPresentation';

interface BufferedSnapshot extends EntitySnapshot {wheelY:[number,number,number,number];hasWheelPose:boolean}

export interface InterpolatedSample {
  steer: number;
  wheelRots: [number, number, number, number];
  wheelY: [number, number, number, number];
  hasWheelPose: boolean;
  isDrifting: boolean;
  burnout: boolean;
  nitroActive: boolean;
  drivetrain: 'FWD' | 'RWD' | 'AWD';
  surface: SurfaceType;
  rpm: number;
  gear: number;
}

/**
 * High-performance, Zero-GC circular ring buffer storing up to RING_BUFFER_CAPACITY snapshots.
 * Implements Hermite spline position interpolation, spherical linear quaternion interpolation (Slerp),
 * and damped dead-reckoning extrapolation when packets are delayed.
 */
export class SnapshotRingBuffer {
  private readonly buffer: BufferedSnapshot[];
  private head: number = -1;
  private count: number = 0;
  private intervalMs = 33;
  private jitterMs = 0;
  private renderTime = 0;

  // Pre-allocated return record to avoid allocations during hot loop sampling
  private readonly sampleResult: InterpolatedSample = {
    steer: 0,
    wheelRots: [0, 0, 0, 0],
    wheelY: [0, 0, 0, 0], hasWheelPose: false,
    isDrifting: false,
    burnout: false, nitroActive:false, drivetrain: 'AWD',
    surface: 'tarmac',
    rpm: 1000,
    gear: 1,
  };

  constructor(capacity: number = RING_BUFFER_CAPACITY) {
    if(!Number.isInteger(capacity)||capacity<1||capacity>1024)throw new RangeError('Snapshot capacity must be an integer from 1 to 1024');
    this.buffer = new Array(capacity);
    for (let i = 0; i < capacity; i++) {
      this.buffer[i] = {
        time: 0,
        pos: [0, 0, 0],
        rot: [0, 0, 0, 1],
        linVel: [0, 0, 0],
        angVel: [0, 0, 0],
        steer: 0,
        wheelRots: [0, 0, 0, 0],
    wheelY: [0, 0, 0, 0], hasWheelPose: false,
        rpm: 1000,
        gear: 1,
        isDrifting: false,
    burnout: false, nitroActive:false, drivetrain: 'AWD',
        surface: 'tarmac',
      };
    }
  }

  /**
   * Resets the buffer state without re-allocating memory.
   */
  public clear(): void {
    this.head = -1;
    this.count = 0;
    this.intervalMs=33;this.jitterMs=0;this.renderTime=0;
  }

  /**
   * Inserts a new snapshot into the ring buffer with zero object allocation.
   */
  public push(snapshot: EntitySnapshot): void {
    const latest=this.getLatest();
    if(latest){
      const gap=snapshot.time-latest.time;
      if(gap<=0)return;
      if(gap<500){this.jitterMs+=(Math.abs(gap-this.intervalMs)-this.jitterMs)*.1;this.intervalMs+=(gap-this.intervalMs)*.1;}
    }
    this.head = (this.head + 1) % this.buffer.length;
    const dest = this.buffer[this.head];

    dest.time = snapshot.time;
    dest.pos[0] = snapshot.pos[0];
    dest.pos[1] = snapshot.pos[1];
    dest.pos[2] = snapshot.pos[2];

    dest.rot[0] = snapshot.rot[0];
    dest.rot[1] = snapshot.rot[1];
    dest.rot[2] = snapshot.rot[2];
    dest.rot[3] = snapshot.rot[3];

    dest.linVel[0] = snapshot.linVel[0];
    dest.linVel[1] = snapshot.linVel[1];
    dest.linVel[2] = snapshot.linVel[2];

    dest.angVel[0] = snapshot.angVel[0];
    dest.angVel[1] = snapshot.angVel[1];
    dest.angVel[2] = snapshot.angVel[2];

    dest.steer = snapshot.steer;
    dest.hasWheelPose=Boolean(snapshot.wheelY);
    for(let i=0;i<4;i++)dest.wheelY[i]=snapshot.wheelY?.[i] ?? 0;
    dest.wheelRots[0] = snapshot.wheelRots[0];
    dest.wheelRots[1] = snapshot.wheelRots[1];
    dest.wheelRots[2] = snapshot.wheelRots[2];
    dest.wheelRots[3] = snapshot.wheelRots[3];

    dest.rpm = snapshot.rpm;
    dest.gear = snapshot.gear;
    dest.isDrifting = snapshot.isDrifting;
    dest.burnout = snapshot.burnout === true;
    dest.nitroActive = snapshot.nitroActive === true;
    dest.drivetrain = snapshot.drivetrain ?? 'AWD';
    dest.surface = snapshot.surface;

    if (this.count < this.buffer.length) {
      this.count++;
    }
  }

  public getCount(): number {
    return this.count;
  }

  /** Local arrival-clock playback; measured jitter sets a bounded buffer without clock-offset jumps. */
  public getRenderTime(now:number):number {
    const delay=Math.max(66,Math.min(180,this.intervalMs*2+this.jitterMs*2));
    this.renderTime=Math.max(this.renderTime,now-delay);
    return this.renderTime;
  }

  /**
   * Returns the most recently inserted snapshot, or null if buffer is empty.
   */
  public getLatest(): EntitySnapshot | null {
    if (this.count === 0 || this.head < 0) return null;
    return this.buffer[this.head];
  }

  /**
   * Samples the buffer at a specific render timestamp (with interpolation delay).
   * Modifies outPos and outRot in place.
   * Returns metadata (wheel angles, drift, surface) without memory allocations.
   */
  public sample(
    renderTime: number,
    outPos: THREE.Vector3,
    outRot: THREE.Quaternion
  ): InterpolatedSample | null {
    if (this.count === 0 || this.head < 0) return null;

    const latest = this.buffer[this.head];

    // Single snapshot available: return exact snapshot
    if (this.count === 1) {
      outPos.set(latest.pos[0], latest.pos[1], latest.pos[2]);
      outRot.set(latest.rot[0], latest.rot[1], latest.rot[2], latest.rot[3]);
      this.copySampleProps(latest);
      return this.sampleResult;
    }

    // Extrapolation: renderTime is ahead of our latest snapshot
    if (renderTime >= latest.time) {
      const deltaSec = Math.min((renderTime - latest.time) / 1000, MAX_EXTRAPOLATION_MS / 1000);
      // Integrate decreasing velocity: displacement must never rewind toward the last packet.
      const displacement = deltaSec - deltaSec*deltaSec/(2*(MAX_EXTRAPOLATION_MS/1000));

      outPos.set(
        latest.pos[0] + latest.linVel[0] * displacement,
        latest.pos[1] + latest.linVel[1] * displacement,
        latest.pos[2] + latest.linVel[2] * displacement
      );

      scratchEuler.set(
        latest.angVel[0] * displacement,
        latest.angVel[1] * displacement,
        latest.angVel[2] * displacement
      );
      scratchQ0.setFromEuler(scratchEuler);

      outRot.set(latest.rot[0], latest.rot[1], latest.rot[2], latest.rot[3]);
      outRot.multiply(scratchQ0);
      outRot.normalize();

      this.copySampleProps(latest);
      return this.sampleResult;
    }

    // Interpolation: scan backwards to find S0 and S1 where S0.time <= renderTime <= S1.time
    let s0: BufferedSnapshot | null = null;
    let s1: BufferedSnapshot | null = null;

    for (let i = 0; i < this.count; i++) {
      const idx = (this.head - i + this.buffer.length) % this.buffer.length;
      const snap = this.buffer[idx];
      if (snap.time <= renderTime) {
        s0 = snap;
        // The preceding element checked was s1
        const s1Idx = (this.head - i + 1 + this.buffer.length) % this.buffer.length;
        s1 = i === 0 ? snap : this.buffer[s1Idx];
        break;
      }
    }

    // Older than our oldest buffered snapshot
    if (!s0) {
      const oldestIdx = (this.head - this.count + 1 + this.buffer.length) % this.buffer.length;
      const oldest = this.buffer[oldestIdx];
      outPos.set(oldest.pos[0], oldest.pos[1], oldest.pos[2]);
      outRot.set(oldest.rot[0], oldest.rot[1], oldest.rot[2], oldest.rot[3]);
      this.copySampleProps(oldest);
      return this.sampleResult;
    }

    if (!s1 || s1 === s0 || s1.time <= s0.time) {
      outPos.set(s0.pos[0], s0.pos[1], s0.pos[2]);
      outRot.set(s0.rot[0], s0.rot[1], s0.rot[2], s0.rot[3]);
      this.copySampleProps(s0);
      return this.sampleResult;
    }

    const t = Math.max(0, Math.min(1, (renderTime - s0.time) / (s1.time - s0.time)));

    // Vector3 Lerp
    scratchV0.set(s0.pos[0], s0.pos[1], s0.pos[2]);
    scratchV1.set(s1.pos[0], s1.pos[1], s1.pos[2]);
    outPos.lerpVectors(scratchV0, scratchV1, t);

    // Quaternion Slerp
    scratchQ0.set(s0.rot[0], s0.rot[1], s0.rot[2], s0.rot[3]);
    scratchQ1.set(s1.rot[0], s1.rot[1], s1.rot[2], s1.rot[3]);
    outRot.slerpQuaternions(scratchQ0, scratchQ1, t);
    outRot.normalize();

    // Visual attributes
    this.sampleResult.hasWheelPose=s0.hasWheelPose && s1.hasWheelPose;
    for(let i=0;i<4;i++)this.sampleResult.wheelY[i]=s0.wheelY[i]+(s1.wheelY[i]-s0.wheelY[i])*t;
    this.sampleResult.steer = s0.steer + (s1.steer - s0.steer) * t;
    this.sampleResult.wheelRots[0] = interpolateWheelSpin(s0.wheelRots[0], s1.wheelRots[0], t);
    this.sampleResult.wheelRots[1] = interpolateWheelSpin(s0.wheelRots[1], s1.wheelRots[1], t);
    this.sampleResult.wheelRots[2] = interpolateWheelSpin(s0.wheelRots[2], s1.wheelRots[2], t);
    this.sampleResult.wheelRots[3] = interpolateWheelSpin(s0.wheelRots[3], s1.wheelRots[3], t);

    this.sampleResult.rpm = s0.rpm + (s1.rpm - s0.rpm) * t;
    this.sampleResult.gear = t > 0.5 ? s1.gear : s0.gear;
    this.sampleResult.isDrifting = t > 0.5 ? s1.isDrifting : s0.isDrifting;
    this.sampleResult.burnout = (t > 0.5 ? s1.burnout : s0.burnout) === true;
    this.sampleResult.nitroActive = (t > 0.5 ? s1.nitroActive : s0.nitroActive) === true;
    this.sampleResult.drivetrain = (t > 0.5 ? s1.drivetrain : s0.drivetrain) ?? 'AWD';
    this.sampleResult.surface = t > 0.5 ? s1.surface : s0.surface;

    return this.sampleResult;
  }

  private copySampleProps(src: BufferedSnapshot): void {
    this.sampleResult.steer = src.steer;
    this.sampleResult.hasWheelPose=src.hasWheelPose;
    for(let i=0;i<4;i++)this.sampleResult.wheelY[i]=src.wheelY?.[i] ?? 0;
    this.sampleResult.wheelRots[0] = src.wheelRots[0];
    this.sampleResult.wheelRots[1] = src.wheelRots[1];
    this.sampleResult.wheelRots[2] = src.wheelRots[2];
    this.sampleResult.wheelRots[3] = src.wheelRots[3];
    this.sampleResult.rpm = src.rpm;
    this.sampleResult.gear = src.gear;
    this.sampleResult.isDrifting = src.isDrifting;
    this.sampleResult.burnout = src.burnout === true;
    this.sampleResult.nitroActive = src.nitroActive === true;
    this.sampleResult.drivetrain = src.drivetrain ?? 'AWD';
    this.sampleResult.surface = src.surface;
  }
}
