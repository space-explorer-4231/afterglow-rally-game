import { describe, expect, it, vi } from 'vitest';
import { BoxGeometry, Group, Mesh, MeshPhysicalMaterial, MeshStandardMaterial, Texture } from 'three';
import { createVehicleFinish, createVehicleVisualResources } from '../vehicleFinish';
import { getStageLighting } from '@/config/stageLighting';

describe('Owned vehicle finishes', () => {
  it('upgrades standard body paint to a dielectric clearcoat while retaining authored maps and color', () => {
    const texture = new Texture();
    const source = new MeshStandardMaterial({ name: 'Body_Color', color: '#2374bc', map: texture, normalMap: texture });
    const originalRoughness = source.roughness;
    const finish = createVehicleFinish(source, 'high', false);
    expect(finish).toBeInstanceOf(MeshPhysicalMaterial);
    if (!(finish instanceof MeshPhysicalMaterial)) throw new Error('Expected physical paint');
    expect(finish.defines).toHaveProperty('PHYSICAL');
    expect(finish.clearcoat).toBe(1); expect(finish.clearcoatRoughness).toBeGreaterThan(0);
    expect(finish.color.equals(source.color)).toBe(true); expect(finish.map).toBe(texture);
    expect(finish.normalMap).toBe(texture); expect(finish.metalness).toBeLessThan(.2);
    expect(source).not.toBe(finish); expect(source.roughness).toBe(originalRoughness);
    expect(Number.isFinite(finish.ior)).toBe(true);
    source.dispose(); finish.dispose(); texture.dispose();
  });
  it.each([['low', false], ['high', true]] as const)('keeps a standard-material fallback at %s/mobile=%s', (quality, mobile) => {
    const source = new MeshStandardMaterial({ name: 'Body_Color' });
    const finish = createVehicleFinish(source, quality, mobile);
    expect(finish).toBeInstanceOf(MeshStandardMaterial); expect(finish).not.toBeInstanceOf(MeshPhysicalMaterial);
    finish.dispose(); source.dispose();
  });
  it('preserves non-paint roughness, transparency and physically authored material details', () => {
    const glass = new MeshPhysicalMaterial({ name: 'Glass_Gray', roughness: .18, transparent: true, opacity: .42, transmission: .2 });
    const finish = createVehicleFinish(glass, 'high', false);
    expect(finish).toBeInstanceOf(MeshPhysicalMaterial);
    if (!(finish instanceof MeshPhysicalMaterial)) throw new Error('Expected physical glass');
    expect(finish.roughness).toBe(.18); expect(finish.opacity).toBe(.42); expect(finish.transmission).toBe(.2);
    finish.dispose(); glass.dispose();
  });
  it('shares owned finishes across meshes, keeps cached assets unchanged, and disposes once', () => {
    const source = new Group(), geometry = new BoxGeometry(), material = new MeshStandardMaterial({ name: 'Body_Color' });
    source.add(new Mesh(geometry, material), new Mesh(geometry, material));
    const resources = createVehicleVisualResources(source, 'medium', false);
    const first = resources.model.children[0], second = resources.model.children[1];
    if (!(first instanceof Mesh) || !(second instanceof Mesh)) throw new Error('Expected cloned meshes');
    expect(first.material).toBe(second.material); expect(first.material).not.toBe(material);
    expect(first.geometry).toBe(geometry); expect(first.castShadow).toBe(true);
    const disposeMaterial = vi.spyOn(first.material, 'dispose'), disposeGeometry = vi.spyOn(geometry, 'dispose');
    resources.dispose(); resources.dispose();
    expect(disposeMaterial).toHaveBeenCalledTimes(1); expect(disposeGeometry).not.toHaveBeenCalled();
    expect((source.children[0] as Mesh).material).toBe(material);
    geometry.dispose(); material.dispose();
  });
  it('gives snow brighter ground bounce and desert warmer bounce without allocations on selection', () => {
    const snow = getStageLighting('level3_sweden', false), desert = getStageLighting('level2_desert', false);
    expect(snow.groundColor).not.toBe(desert.groundColor);
    expect(snow.hemisphereIntensity).toBeGreaterThan(desert.hemisphereIntensity);
    expect(getStageLighting('level3_sweden', false)).toBe(snow);
    for (const profile of [snow, desert, getStageLighting('level4_britain', false)]) {
      expect(profile.directionalIntensity).toBeGreaterThan(0); expect(profile.ambientIntensity).toBeLessThan(.4);
    }
  });
});
