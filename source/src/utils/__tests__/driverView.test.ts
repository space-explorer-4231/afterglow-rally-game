import { describe, expect, it } from 'vitest';
import { Euler, Quaternion, Vector3 } from 'three';
import { driverEyeHeight, setDriverViewRotation } from '../driverView';
import { getAvailableVehicles } from '@/config/vehicleRegistry';

describe('driver-eye camera', () => {
  it('places eyes at a usable height for every car and guards invalid dimensions', () => {
    for (const car of getAvailableVehicles()) {
      expect(driverEyeHeight(car.config.chassisSize[1])).toBeGreaterThanOrEqual(1.05);
      expect(driverEyeHeight(car.config.chassisSize[1])).toBeLessThanOrEqual(1.65);
    }
    expect(driverEyeHeight(Number.NaN)).toBe(1.05);
  });
  it('looks forward through a drift and backward only on request', () => {
    const body = new Quaternion().setFromEuler(new Euler(0, 1.2, 0, 'YXZ'));
    const expected = new Vector3(0, 0, 1).applyQuaternion(body);
    const output = new Quaternion();
    const scratch = new Euler(0, 0, 0, 'YXZ');
    setDriverViewRotation(body, output, scratch, false);
    expect(new Vector3(0, 0, -1).applyQuaternion(output).dot(expected)).toBeCloseTo(1);
    setDriverViewRotation(body, output, scratch, true);
    expect(new Vector3(0, 0, -1).applyQuaternion(output).dot(expected)).toBeCloseTo(-1);
  });
  it('removes roll and limits pitch while preserving heading', () => {
    const body = new Quaternion().setFromEuler(new Euler(0.8, 0.9, 0.6, 'YXZ'));
    const output = new Quaternion();
    const scratch = new Euler(0, 0, 0, 'YXZ');
    setDriverViewRotation(body, output, scratch, true);
    const result = new Euler().setFromQuaternion(output, 'YXZ');
    expect(result.z).toBeCloseTo(0);
    expect(Math.abs(result.x)).toBeLessThanOrEqual(0.280001);
    expect(result.y).toBeCloseTo(0.9);
  });
});
