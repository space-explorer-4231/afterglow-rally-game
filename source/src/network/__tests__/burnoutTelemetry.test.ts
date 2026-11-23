import { describe, expect, it } from 'vitest';
import { Vector3, Quaternion } from 'three';
import { validateEntitySnapshot } from '../packetValidator';
import { SnapshotRingBuffer } from '../snapshotRingBuffer';

const packet = { time: 1000, pos: [0, 9, 0], rot: [0, 0, 0, 1], linVel: [0, 0, 0], angVel: [0, 0, 0],
  steer: 0, wheelRots: [0, 0, 20, 20], rpm: 6500, gear: 1, isDrifting: false,
  burnout: true, drivetrain: 'RWD', surface: 'tarmac' };
describe('Burnout and drivetrain snapshot contract', () => {
  it('rejects malformed flags and unknown torque routing', () => {
    expect(validateEntitySnapshot({ ...packet, burnout: 'yes' })).toBeNull();
    expect(validateEntitySnapshot({ ...packet, drivetrain: 'INVALID' })).toBeNull();
    expect(validateEntitySnapshot(packet)?.drivetrain).toBe('RWD');
  });
  it('retains state and wheel motion through interpolation and extrapolation', () => {
    const first = validateEntitySnapshot(packet);
    const second = validateEntitySnapshot({ ...packet, time: 1033, wheelRots: [0, 0, 24, 24] });
    if (!first || !second) throw Error('Valid packet rejected');
    const buffer = new SnapshotRingBuffer();
    buffer.push(first); buffer.push(second);
    const position = new Vector3(), rotation = new Quaternion();
    const middle = buffer.sample(1020, position, rotation);
    expect(middle?.burnout).toBe(true); expect(middle?.drivetrain).toBe('RWD');
    expect(middle?.wheelRots[2]).toBeGreaterThan(20);
    expect(buffer.sample(1080, position, rotation)?.burnout).toBe(true);
  });
});
