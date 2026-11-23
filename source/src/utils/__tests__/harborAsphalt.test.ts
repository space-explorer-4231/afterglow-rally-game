import { expect, it, vi } from 'vitest';
import { InstancedMesh, MeshStandardMaterial, NoColorSpace, SRGBColorSpace, Texture } from 'three';
import { createHarborRenderResources } from '../harborRendering';
it('gives parking asphalt measured surface maps at metre scale with owned disposal', () => {
  const urban = Array.from({ length: 15 }, () => new Texture()), asphalt = Array.from({ length: 3 }, () => new Texture()), sign = new Texture();
  const resources = createHarborRenderResources([{ x: 0, y: 8, z: 0, w: 6.8, h: .04, d: 11, finish: 'asphalt' }], urban, sign, 'high', false, true, asphalt);
  const mesh = resources.group.children[0];
  if (!(mesh instanceof InstancedMesh) || !(mesh.material instanceof MeshStandardMaterial)) throw new Error('Expected asphalt instances');
  expect(mesh.geometry.getAttribute('urbanDimensions').count).toBe(1);
  expect(mesh.material.map).not.toBe(asphalt[0]); expect(mesh.material.map!.colorSpace).toBe(SRGBColorSpace);
  expect(mesh.material.normalMap!.colorSpace).toBe(NoColorSpace); expect(mesh.material.roughnessMap).not.toBeNull();
  expect(mesh.receiveShadow).toBe(true); expect(resources.textures).toHaveLength(3);
  const dispose = vi.spyOn(resources.textures[0], 'dispose'), cachedDispose = vi.spyOn(asphalt[0], 'dispose');
  resources.dispose(); resources.dispose(); expect(dispose).toHaveBeenCalledTimes(1); expect(cachedDispose).not.toHaveBeenCalled();
  [...urban, ...asphalt, sign].forEach(texture => texture.dispose());
});
it('retains the flat fallback when the optional asphalt set is unavailable', () => {
  const urban = Array.from({ length: 15 }, () => new Texture()), sign = new Texture();
  const resources = createHarborRenderResources([{ x: 0, y: 8, z: 0, w: 7, h: .04, d: 11, finish: 'asphalt' }], urban, sign, 'low', true, false);
  expect(resources.textures).toHaveLength(0); resources.dispose(); [...urban, sign].forEach(texture => texture.dispose());
});
