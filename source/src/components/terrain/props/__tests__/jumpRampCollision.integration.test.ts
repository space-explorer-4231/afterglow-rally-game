import { beforeAll, expect, it } from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import { Matrix4, Quaternion, Vector3 } from 'three';
import { createJumpRampCollisionMesh } from '../jumpRampCollision';
beforeAll(async () => { await RAPIER.init(); });
const yaws = [0, 0.36, -2.76, 2.45];
it.each(yaws)('keeps rails, supports and deck solid at yaw %s', yaw => {
  const rotation = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), yaw);
  const matrix = new Matrix4().compose(new Vector3(12, 8, -20), rotation, new Vector3(1, 1, 1));
  const mesh = createJumpRampCollisionMesh(matrix);
  const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
  world.createCollider(RAPIER.ColliderDesc.trimesh(mesh.vertices, mesh.indices));
  world.step();
  // Horizontal rays below the deck must hit the rear supports/backboard.
  for (const x of [-2.65, 0, 2.65]) {
    const origin = new Vector3(x, 0.3, 10).applyMatrix4(matrix);
    const direction = new Vector3(0, 0, -1).applyQuaternion(rotation);
    expect(world.castRay(new RAPIER.Ray(origin, direction), 12, true)).not.toBeNull();
  }
  // Both steel runners are higher than the deck and must have their own contact.
  for (const x of [-2.75, 2.75]) {
    const origin = new Vector3(x, 4, 0).applyMatrix4(matrix);
    const hit = world.castRay(new RAPIER.Ray(origin, { x: 0, y: -1, z: 0 }), 6, true);
    expect(hit).not.toBeNull();
    expect(hit!.timeOfImpact).toBeLessThan(3);
  }
  world.free();
});
it.each([30, 60, 120])('stops a car crossing the tall rear barrier at %s km/h with CCD', speed => {
  for (const yaw of yaws) {
    const rotation = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), yaw);
    const matrix = new Matrix4().makeRotationFromQuaternion(rotation);
    const mesh = createJumpRampCollisionMesh(matrix);
    const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
    world.createCollider(RAPIER.ColliderDesc.cuboid(100, 0.1, 100).setTranslation(0, -0.1, 0));
    world.createCollider(RAPIER.ColliderDesc.trimesh(mesh.vertices, mesh.indices));
    const start = new Vector3(0, 0.6, 12).applyQuaternion(rotation);
    const velocity = new Vector3(0, 0, -speed / 3.6).applyQuaternion(rotation);
    const body = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(start.x, start.y, start.z)
      .setRotation(rotation).setCcdEnabled(true));
    world.createCollider(RAPIER.ColliderDesc.cuboid(0.8, 0.45, 1.6).setMass(1300), body);
    body.setLinvel(velocity, true);
    for (let step = 0; step < 180; step++) {
      world.step();
      const p = body.translation();
      const local = new Vector3(p.x, p.y, p.z).applyQuaternion(rotation.clone().invert());
      expect(local.z).toBeGreaterThan(3.7);
      expect(Number.isFinite(local.y)).toBe(true);
    }
    world.free();
  }
});
