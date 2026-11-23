import { describe, expect, it } from 'vitest';
import { BoxGeometry, InstancedMesh, Matrix4, MeshStandardMaterial, Object3D, PerspectiveCamera, Texture } from 'three';
import { configureUrbanGeometry } from '@/components/environment/urbanMaterial';
import { HARBOR_BUILDINGS } from '@/config/harborScenery';
import { buildHarborArchitecture, type HarborPart } from '../harborArchitecture';
import { createHarborRenderResources } from '../harborRendering';
import { createHarborVisibilityController } from '../harborVisibility';

describe('Harbor material batching and padded visibility', () => {
  it('compacts transforms and metre dimensions together, including reversal and re-entry', () => {
    const parts: HarborPart[] = [
      { x: 0, y: 0, z: -80, w: 3, h: 6, d: 9, finish: 'stucco' },
      { x: 0, y: 0, z: 80, w: 12, h: 15, d: 18, finish: 'stucco' },
    ];
    const geometry = new BoxGeometry(1, 1, 1), material = new MeshStandardMaterial();
    configureUrbanGeometry(geometry, new Float32Array(parts.flatMap(p => [p.w, p.h, p.d])));
    const mesh = new InstancedMesh(geometry, material, parts.length), dummy = new Object3D();
    parts.forEach((p, i) => {
      dummy.position.set(p.x, p.y, p.z); dummy.scale.set(p.w, p.h, p.d); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.updateMatrixWorld(true);
    const controller = createHarborVisibilityController([{ mesh, parts }]);
    const camera = new PerspectiveCamera(60, 16 / 9, .35, 650), matrix = new Matrix4();
    camera.updateMatrixWorld(true); controller.update(camera, 1);
    expect(mesh.count).toBe(1); mesh.getMatrixAt(0, matrix); expect(matrix.elements[14]).toBe(-80);
    expect(Array.from(geometry.getAttribute('urbanDimensions').array).slice(0, 3)).toEqual([3, 6, 9]);
    const stableVersion = mesh.instanceMatrix.version;
    controller.update(camera, 1.2); expect(mesh.instanceMatrix.version).toBe(stableVersion);
    camera.lookAt(0, 0, 100); camera.updateMatrixWorld(true); controller.update(camera, 1.21);
    expect(mesh.count).toBe(1); mesh.getMatrixAt(0, matrix); expect(matrix.elements[14]).toBe(80);
    expect(Array.from(geometry.getAttribute('urbanDimensions').array).slice(0, 3)).toEqual([12, 15, 18]);
    camera.lookAt(0, 0, -100); camera.updateMatrixWorld(true); controller.update(camera, 1.22);
    mesh.getMatrixAt(0, matrix); expect(matrix.elements[14]).toBe(-80);
    expect(Array.from(geometry.getAttribute('urbanDimensions').array).slice(0, 3)).toEqual([3, 6, 9]);
    geometry.dispose(); material.dispose(); mesh.dispose();
  });

  it('retains padded objects beyond the view edge while rejecting distant offscreen objects', () => {
    const parts: HarborPart[] = [
      { x: 39, y: 0, z: -50, w: 2, h: 2, d: 2, finish: 'metal' },
      { x: 180, y: 0, z: -50, w: 2, h: 2, d: 2, finish: 'metal' },
    ];
    const geometry = new BoxGeometry(), material = new MeshStandardMaterial(), mesh = new InstancedMesh(geometry, material, 2);
    const controller = createHarborVisibilityController([{ mesh, parts }]);
    const camera = new PerspectiveCamera(60, 1, .35, 650); camera.updateMatrixWorld(true);
    controller.update(camera, 1); expect(mesh.count).toBe(1);
    geometry.dispose(); material.dispose(); mesh.dispose();
  });

  it('preserves all authored city parts with at most one draw per finish, retaining shadow caster cells', () => {
    const parts = buildHarborArchitecture(HARBOR_BUILDINGS.map(() => 8));
    const textures = Array.from({ length: 15 }, () => new Texture()), sign = new Texture();
    const regular = createHarborRenderResources(parts, textures, sign, 'medium', false, false);
    const shadowed = createHarborRenderResources(parts, textures, sign, 'high', false, true);
    let count = 0;
    regular.group.traverse(object => { if (object instanceof InstancedMesh) count += object.count; });
    expect(count).toBe(parts.length);
    expect(regular.group.children.length).toBe(new Set(parts.map(p => p.finish)).size);
    expect(regular.group.children.length).toBeLessThanOrEqual(16);
    expect(shadowed.group.children.length).toBeGreaterThan(regular.group.children.length * 2);
    const originalShadowCounts = shadowed.group.children.map(child => child instanceof InstancedMesh ? child.count : 0);
    const camera = new PerspectiveCamera(60, 1, .35, 650); camera.updateMatrixWorld(true);
    shadowed.updateVisibility(camera, 1);
    expect(shadowed.group.children.map(child => child instanceof InstancedMesh ? child.count : 0)).toEqual(originalShadowCounts);
    regular.dispose(); regular.dispose(); shadowed.dispose(); textures.forEach(t => t.dispose()); sign.dispose();
  });
});
