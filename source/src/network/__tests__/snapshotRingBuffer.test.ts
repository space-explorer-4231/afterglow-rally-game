import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { SnapshotRingBuffer, RING_BUFFER_CAPACITY } from '../snapshotRingBuffer';
import type { EntitySnapshot } from '@/types/network';

function makeSnapshot(time: number, x: number, y: number, z: number): EntitySnapshot {
  return {
    time,
    pos: [x, y, z],
    rot: [0, 0, 0, 1],
    linVel: [10, 0, 0],
    angVel: [0, 0, 0],
    steer: 0.1,
    wheelRots: [1, 1, 1, 1],
    rpm: 3000,
    gear: 2,
    isDrifting: false,
    surface: 'tarmac',
  };
}

describe('SnapshotRingBuffer', () => {
  it('starts empty and reports null sample when no snapshots', () => {
    const buffer = new SnapshotRingBuffer();
    expect(buffer.getCount()).toBe(0);
    expect(buffer.getLatest()).toBeNull();

    const outPos = new THREE.Vector3();
    const outRot = new THREE.Quaternion();
    expect(buffer.sample(1000, outPos, outRot)).toBeNull();
  });

  it('handles single snapshot sampling cleanly', () => {
    const buffer = new SnapshotRingBuffer();
    buffer.push(makeSnapshot(1000, 10, 5, 20));

    expect(buffer.getCount()).toBe(1);
    const outPos = new THREE.Vector3();
    const outRot = new THREE.Quaternion();
    const sample = buffer.sample(1000, outPos, outRot);

    expect(sample).not.toBeNull();
    expect(outPos.x).toBeCloseTo(10);
    expect(outPos.y).toBeCloseTo(5);
    expect(outPos.z).toBeCloseTo(20);
    expect(sample?.rpm).toBe(3000);
  });

  it('interpolates smoothly between two snapshots', () => {
    const buffer = new SnapshotRingBuffer();
    buffer.push(makeSnapshot(1000, 0, 0, 0));
    buffer.push(makeSnapshot(1100, 10, 0, 0));

    const outPos = new THREE.Vector3();
    const outRot = new THREE.Quaternion();

    // Sample exactly in the middle at t = 1050
    const sample = buffer.sample(1050, outPos, outRot);
    expect(sample).not.toBeNull();
    expect(outPos.x).toBeCloseTo(5); // 50% between 0 and 10
  });

  it('extrapolates using linear velocity when sample time exceeds latest snapshot', () => {
    const buffer = new SnapshotRingBuffer();
    buffer.push(makeSnapshot(1000, 0, 0, 0));
    buffer.push(makeSnapshot(1100, 10, 0, 0)); // linVel is [10, 0, 0]

    const outPos = new THREE.Vector3();
    const outRot = new THREE.Quaternion();

    // Sample 50ms into future (t = 1150)
    const sample = buffer.sample(1150, outPos, outRot);
    expect(sample).not.toBeNull();
    // Position should advance forward from 10
    expect(outPos.x).toBeGreaterThan(10);
  });

  it('wraps around circular buffer without exceeding capacity or leaking', () => {
    const buffer = new SnapshotRingBuffer();
    for (let i = 0; i < RING_BUFFER_CAPACITY * 3; i++) {
      buffer.push(makeSnapshot(1000 + i * 50, i, 0, 0));
    }

    expect(buffer.getCount()).toBe(RING_BUFFER_CAPACITY);
    const latest = buffer.getLatest();
    expect(latest).not.toBeNull();
    expect(latest?.time).toBe(1000 + (RING_BUFFER_CAPACITY * 3 - 1) * 50);
  });
});

it('never reverses predicted motion during an outage and freezes after its limit',()=>{
  const buffer=new SnapshotRingBuffer();buffer.push(makeSnapshot(1000,0,0,0));buffer.push(makeSnapshot(1100,1,0,0));
  const position=new THREE.Vector3(),rotation=new THREE.Quaternion();let previous=1;
  for(let offset=0;offset<=1000;offset+=10){buffer.sample(1100+offset,position,rotation);expect(position.x).toBeGreaterThanOrEqual(previous);previous=position.x;}
  expect(position.x).toBeCloseTo(2.25);
});
it('uses measured local jitter without moving its playback clock backward',()=>{
  const buffer=new SnapshotRingBuffer();let arrival=100000,previous=0;
  for(let i=0;i<100;i++){arrival+=[33,40,80,15][i%4];buffer.push(makeSnapshot(arrival,i,0,0));const time=buffer.getRenderTime(arrival);expect(time).toBeGreaterThanOrEqual(previous);expect(arrival-time).toBeLessThanOrEqual(180);expect(arrival-time).toBeGreaterThanOrEqual(60);previous=time;}
  buffer.clear();expect(buffer.getCount()).toBe(0);expect(buffer.getRenderTime(1000)).toBe(934);
});
it('honors custom capacity and ignores duplicate or older arrival times',()=>{
  const buffer=new SnapshotRingBuffer(3);
  for(let i=0;i<10;i++)buffer.push(makeSnapshot(1000+i*33,i,0,0));
  buffer.push(makeSnapshot(1000,999,0,0));buffer.push(makeSnapshot(1297,999,0,0));
  expect(buffer.getCount()).toBe(3);expect(buffer.getLatest()?.pos[0]).toBe(9);
  const position=new THREE.Vector3(),rotation=new THREE.Quaternion();buffer.sample(1231,position,rotation);expect(position.x).toBeCloseTo(7);
  expect(()=>new SnapshotRingBuffer(0)).toThrow(RangeError);
});

it('interpolates20Hz vehicle poses at60Hz without staircase motion',()=>{
 const buffer=new SnapshotRingBuffer(),position=new THREE.Vector3(),rotation=new THREE.Quaternion();
 for(let i=0;i<20;i++)buffer.push(makeSnapshot(1000+i*50,i*.5,0,0));
 let previous=6.5;
 for(let frame=1;frame<=18;frame++){
  const time=1650+frame*1000/60;
  expect(buffer.sample(time,position,rotation)).not.toBeNull();
  expect(position.x).toBeCloseTo((time-1000)*.01,5);
  expect(position.x-previous).toBeCloseTo(1/6,5);previous=position.x;
 }
});
