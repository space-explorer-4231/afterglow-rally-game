import { describe, expect, it } from 'vitest';
import { BoxGeometry, Color, Frustum, InstancedMesh, Matrix4, MeshBasicMaterial, PerspectiveCamera } from 'three';
import { createInstanceFrustumCuller } from '../instanceFrustumCulling';

function fixture() {
  const geometry = new BoxGeometry(), material = new MeshBasicMaterial();
  const mesh = new InstancedMesh(geometry, material, 3);
  const matrix = new Matrix4(), color = new Color();
  for (let index = 0; index < 3; index++) {
    mesh.setMatrixAt(index, matrix.makeTranslation((index - 1) * 100, 0, -20));
    mesh.setColorAt(index, color.setRGB(index / 3, .25, .5));
  }
  mesh.computeBoundingSphere();
  const camera = new PerspectiveCamera(60, 16 / 9, .1, 500);
  camera.updateMatrixWorld(true);
  const frustum = new Frustum().setFromProjectionMatrix(new Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
  return { mesh, frustum, dispose: () => { mesh.dispose(); geometry.dispose(); material.dispose(); } };
}

describe('static instance frustum compaction', () => {
  it('submits only the visible transform and its matching color, then fully restores shadow casters', () => {
    const { mesh, frustum, dispose } = fixture(), culler = createInstanceFrustumCuller(mesh, 0);
    const originalBound = mesh.boundingSphere?.clone();
    culler.update(frustum, true);
    expect(mesh.count).toBe(1);
    const matrix = new Matrix4(), color = new Color(); mesh.getMatrixAt(0, matrix); mesh.getColorAt(0, color);
    expect(matrix.elements[12]).toBe(0); expect(color.r).toBeCloseTo(1 / 3);
    expect(mesh.boundingSphere?.equals(originalBound!)).toBe(true);
    culler.update(frustum, false);
    expect(mesh.count).toBe(3);
    for (let index = 0; index < 3; index++) {
      mesh.getMatrixAt(index, matrix); mesh.getColorAt(index, color);
      expect(matrix.elements[12]).toBe((index - 1) * 100); expect(color.r).toBeCloseTo(index / 3);
    }
    dispose();
  });
  it('retains a padded edge instance and avoids buffer updates for an unchanged visible set', () => {
    const { mesh, frustum, dispose } = fixture();
    const culler = createInstanceFrustumCuller(mesh, 120);
    const version = mesh.instanceMatrix.version;
    culler.update(frustum, true);
    expect(mesh.count).toBe(3); expect(mesh.instanceMatrix.version).toBe(version);
    dispose();
  });
  it('can recover from an empty view without losing source transforms or shared geometry', () => {
    const { mesh, frustum, dispose } = fixture();
    const culler = createInstanceFrustumCuller(mesh, 0), geometry = mesh.geometry;
    const camera = new PerspectiveCamera(60, 1, .1, 500); camera.rotation.y = Math.PI; camera.updateMatrixWorld(true);
    const backwards = new Frustum().setFromProjectionMatrix(new Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
    culler.update(backwards, true); expect(mesh.count).toBe(0);
    culler.update(frustum, true); expect(mesh.count).toBe(1); expect(mesh.geometry).toBe(geometry);
    dispose();
  });
});
