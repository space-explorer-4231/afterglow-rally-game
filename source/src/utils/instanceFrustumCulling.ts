import { Color, Frustum, InstancedMesh, Matrix4, Sphere } from 'three';

/** Compact static instance batches against padded bounds without discarding authored transforms or colors.
 * Geometry and source buffers remain owned by the caller. Disable when shadow cameras need offscreen casters.
 */
export function createInstanceFrustumCuller(mesh: InstancedMesh, padding = 5) {
  mesh.geometry.computeBoundingSphere();
  const count = mesh.count;
  const matrices: Matrix4[] = [], bounds: Sphere[] = [];
  const colors = mesh.instanceColor ? new Float32Array(count * 3) : null;
  const visible = new Uint8Array(count);
  visible.fill(1);
  const color = new Color();
  for (let index = 0; index < count; index++) {
    const matrix = new Matrix4(); mesh.getMatrixAt(index, matrix); matrices.push(matrix);
    const bound = (mesh.geometry.boundingSphere ?? new Sphere()).clone().applyMatrix4(matrix);
    bound.radius += padding; bounds.push(bound);
    if (colors) {
      mesh.getColorAt(index, color); colors[index * 3] = color.r; colors[index * 3 + 1] = color.g; colors[index * 3 + 2] = color.b;
    }
  }
  return {
    update(frustum: Frustum, enabled: boolean): void {
      let changed = false;
      for (let index = 0; index < count; index++) {
        const next = !enabled || frustum.intersectsSphere(bounds[index]) ? 1 : 0;
        if (visible[index] !== next) { visible[index] = next; changed = true; }
      }
      if (!changed) return;
      let output = 0;
      for (let index = 0; index < count; index++) {
        if (!visible[index]) continue;
        mesh.setMatrixAt(output, matrices[index]);
        if (colors) { color.setRGB(colors[index * 3], colors[index * 3 + 1], colors[index * 3 + 2]); mesh.setColorAt(output, color); }
        output++;
      }
      mesh.count = output;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      // Keep the original whole-batch bound: shrinking it here would incorrectly cull
      // instances that become visible after the next camera movement.
    },
  };
}
