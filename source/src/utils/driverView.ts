import { Euler, MathUtils, Quaternion } from 'three';

/** Height above the chassis origin, bounded for the complete vehicle roster. */
export function driverEyeHeight(chassisHeight: number): number {
  return MathUtils.clamp(Number.isFinite(chassisHeight) ? chassisHeight + 0.5 : 1.05, 1.05, 1.65);
}

/** Write a roll-stabilized driver view into reusable camera scratch objects. */
export function setDriverViewRotation(
  bodyRotation: Quaternion,
  output: Quaternion,
  scratch: Euler,
  lookBack: boolean,
): void {
  scratch.setFromQuaternion(bodyRotation, 'YXZ');
  scratch.x = MathUtils.clamp(scratch.x * 0.5, -0.28, 0.28);
  scratch.z = 0;
  output.setFromEuler(scratch);
  if (!lookBack) {
    // A camera looks down local -Z; the chassis travels along local +Z.
    const x = output.x;
    const y = output.y;
    const z = output.z;
    const w = output.w;
    output.set(-z, w, x, -y);
  }
}
