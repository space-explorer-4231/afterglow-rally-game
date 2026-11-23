import { Frustum, Sphere, type Matrix4 } from 'three';
import type {PropItem} from './types';

/** Conservative tree bound keeps a margin for wind, camera motion and fast turns. */
export function createVegetationCullSphere(foliage: Sphere, trunk: Sphere, matrix: Matrix4): Sphere {
  const sphere = foliage.clone().union(trunk).applyMatrix4(matrix);
  sphere.radius += 24;
  return sphere;
}

/** Count visible full trees without allocating or modifying the input geometry. */
export function countVisibleVegetation(frustum: Frustum, bounds: readonly Sphere[]): number {
  let count = 0;
  for (const sphere of bounds) if (frustum.intersectsSphere(sphere)) count++;
  return count;
}

/** A static world-space batch; geometry and materials stay shared across all cells. */
export interface VegetationChunk {key:string;items:PropItem[]}

/** Group every tree once into a 180 m cell so off-screen forests can be culled independently. */
export function partitionVegetation(items:readonly PropItem[],cellSize=180):VegetationChunk[] {
  if(!Number.isFinite(cellSize)||cellSize<=0)throw new RangeError('Vegetation cell size must be positive.');
  const chunks=new Map<string,VegetationChunk>();
  for(const item of items){
    const x=Math.floor(item.matrix.elements[12]/cellSize);
    const z=Math.floor(item.matrix.elements[14]/cellSize);
    const key=`${x}:${z}`;
    const chunk=chunks.get(key);
    if(chunk)chunk.items.push(item);
    else chunks.set(key,{key,items:[item]});
  }
  return Array.from(chunks.values());
}
