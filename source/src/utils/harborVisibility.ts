import { Frustum, InstancedBufferAttribute, Matrix4, Quaternion, Sphere, Vector3, type Camera, type InstancedMesh } from 'three';
import type { HarborPart } from './harborArchitecture';

/** One material batch, preserving the immutable authored order and instance transforms. */
export interface HarborVisibilityBatch { mesh: InstancedMesh; parts: readonly HarborPart[] }

/**
 * Compact static architecture into one draw per finish instead of dozens of
 * material/cell draws. Padded part bounds preserve fast camera motion; UV metre
 * dimensions are compacted with transforms so windows and textures never change.
 */
export function createHarborVisibilityController(batches: readonly HarborVisibilityBatch[]) {
  const frustum = new Frustum(), projection = new Matrix4(), sphere = new Sphere();
  const lastPosition = new Vector3(Infinity, Infinity, Infinity), lastRotation = new Quaternion();
  const lastProjection = new Matrix4();
  const sources = batches.map(({ mesh, parts }) => {
    const dimensions = mesh.geometry.getAttribute('urbanDimensions');
    return {
      mesh, parts, matrices: mesh.instanceMatrix.array.slice(),
      dimensions: dimensions instanceof InstancedBufferAttribute ? dimensions : undefined,
      sourceDimensions: dimensions instanceof InstancedBufferAttribute ? dimensions.array.slice() : undefined,
      visibleIds: new Int32Array(parts.length).fill(-1),
    };
  });
  let nextUpdate = 0;
  return {
    update(camera: Camera, elapsedSeconds: number): void {
      if (elapsedSeconds < nextUpdate && camera.position.distanceToSquared(lastPosition) < 9 &&
          Math.abs(camera.quaternion.dot(lastRotation)) > .999 && camera.projectionMatrix.equals(lastProjection)) return;
      nextUpdate = elapsedSeconds + .125;
      lastPosition.copy(camera.position); lastRotation.copy(camera.quaternion); lastProjection.copy(camera.projectionMatrix);
      projection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      frustum.setFromProjectionMatrix(projection);
      for (const source of sources) {
        const { mesh, parts, matrices, dimensions, sourceDimensions, visibleIds } = source;
        const worldScale = mesh.matrixWorld.getMaxScaleOnAxis();
        let count = 0, changed = false;
        for (let index = 0; index < parts.length; index++) {
          const part = parts[index];
          sphere.center.set(part.x, part.y, part.z).applyMatrix4(mesh.matrixWorld);
          sphere.radius = Math.hypot(part.w, part.h, part.d) * .5 * worldScale + 24;
          if (!frustum.intersectsSphere(sphere)) continue;
          if (visibleIds[count] !== index) {
            changed = true; visibleIds[count] = index;
            for (let n = 0; n < 16; n++) mesh.instanceMatrix.array[count * 16 + n] = matrices[index * 16 + n];
            if (dimensions && sourceDimensions) for (let n = 0; n < 3; n++) dimensions.array[count * 3 + n] = sourceDimensions[index * 3 + n];
          }
          count++;
        }
        mesh.count = count;
        // Bounds are camera-filtered above. Never reuse the original cell's sphere
        // after matrix compaction, and do not upload unchanged instance streams.
        mesh.frustumCulled = false;
        if (changed) {
          mesh.instanceMatrix.needsUpdate = true;
          if (dimensions) dimensions.needsUpdate = true;
        }
      }
    },
  };
}
