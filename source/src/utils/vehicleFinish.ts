import { Material, Mesh, MeshPhysicalMaterial, MeshStandardMaterial, type Object3D } from 'three';
import type { GraphicsQuality } from '@/types/game';

/** Owned finish; geometry and texture buffers remain shared with the glTF cache. */
export function createVehicleFinish(source: Material, quality: GraphicsQuality, mobile: boolean): Material {
  const detailed = !mobile && quality !== 'low';
  if (source instanceof MeshStandardMaterial && source.name === 'Body_Color') {
    const paint = detailed ? new MeshPhysicalMaterial() : source.clone();
    if (paint instanceof MeshPhysicalMaterial && !(source instanceof MeshPhysicalMaterial)) {
      MeshStandardMaterial.prototype.copy.call(paint, source);
    } else paint.copy(source);
    paint.roughness = 0.3;
    paint.metalness = 0.12;
    paint.envMapIntensity = 1;
    if (paint instanceof MeshPhysicalMaterial && detailed) {
      paint.defines = { STANDARD: '', PHYSICAL: '' };
      paint.clearcoat = 1;
      paint.clearcoatRoughness = 0.16;
      paint.ior = 1.5;
    }
    return paint;
  }
  const material = source.clone();
  if (material instanceof MeshStandardMaterial) material.envMapIntensity = 1;
  return material;
}

export function createVehicleVisualResources(scene: Object3D, quality: GraphicsQuality, mobile: boolean) {
  const model = scene.clone(true);
  const materials = new Map<Material, Material>();
  const finish = (source: Material) => {
    let result = materials.get(source);
    if (!result) { result = createVehicleFinish(source, quality, mobile); materials.set(source, result); }
    return result;
  };
  model.traverse(object => {
    if (!(object instanceof Mesh)) return;
    object.material = Array.isArray(object.material) ? object.material.map(finish) : finish(object.material);
    object.castShadow = !mobile; object.receiveShadow = !mobile;
  });
  let disposed = false;
  return { model, dispose: () => {
    if (disposed) return;
    disposed = true;
    for (const material of materials.values()) material.dispose();
  } };
}
