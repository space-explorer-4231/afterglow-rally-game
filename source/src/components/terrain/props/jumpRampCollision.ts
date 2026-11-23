import { createJumpRampGeometry } from './geometries';
import type { PropItem } from './types';

/** Use the visible mesh so every rail, support and backboard has matching contact. */
export function createJumpRampCollisionMesh(matrix: PropItem['matrix']) {
  const geometry = createJumpRampGeometry();
  geometry.applyMatrix4(matrix);
  const vertices = new Float32Array(geometry.getAttribute('position').array);
  const indices = new Uint32Array(geometry.getIndex()!.array);
  geometry.dispose();
  return { vertices, indices };
}
