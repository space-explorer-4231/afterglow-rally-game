import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Color, CubeCamera, HalfFloatType, Mesh, MeshStandardMaterial, PMREMGenerator, WebGLCubeRenderTarget, Vector3 } from 'three';
import type { Object3D, WebGLRenderTarget } from 'three';
import { useSettingsStore } from '@/store/settingsStore';
import { isMobileOrAndroid } from '@/utils/device';
import { useGameStore } from '@/store/gameStore';

/** Local vehicle reflection probe. Bounded cadence/resolution; cached materials are never mutated. */
export function useVehicleReflections(model: Object3D): void {
  const { gl, scene } = useThree();
  const quality = useSettingsStore(s => s.graphicsQuality);
  const enabled = !isMobileOrAndroid() && quality !== 'low';
  const probe = useMemo(() => {
    if (!enabled) return null;
    const cube = new WebGLCubeRenderTarget(quality === 'very_high' ? 128 : 64, { type: HalfFloatType, generateMipmaps: false });
    const camera = new CubeCamera(0.4, 220, cube);
    const generator = new PMREMGenerator(gl); generator.compileCubemapShader();
    const materials: MeshStandardMaterial[] = [];
    model.traverse(object => {
      if (!(object instanceof Mesh)) return;
      const list = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of list) if (material instanceof MeshStandardMaterial) materials.push(material);
    });
    const captureObjects:Object3D[]=[];
    const captureVisibility:boolean[]=[];
    const selectCaptureDetail=(object:Object3D)=>{
      if(object.userData.reflectionNearFoliage!==true&&object.userData.reflectionFarFoliage!==true)return;
      captureObjects.push(object);captureVisibility.push(object.visible);
      object.visible=object.userData.reflectionFarFoliage===true;
    };
    return { cube, camera, generator, filtered: null as WebGLRenderTarget | null, materials,
      captureObjects,captureVisibility,selectCaptureDetail,
      sky: new Color('#94b5c9'), lastPosition: new Vector3(Infinity, 0, 0), position: new Vector3(), elapsed: 10, frames: 0 };
  }, [enabled, quality, gl, model]);
  const slowFrames = useRef(0);
  useEffect(() => () => {
    if (!probe) return;
    for (const material of probe.materials) material.envMap = null;
    probe.filtered?.dispose(); probe.cube.dispose(); probe.generator.dispose();
  }, [probe]);
  useFrame((_, delta) => {
    if (!probe || useGameStore.getState().gameState !== 'playing') return;
    probe.elapsed += Math.min(delta, 0.1);
    slowFrames.current = delta > 0.04 ? Math.min(120, slowFrames.current + 1) : Math.max(0, slowFrames.current - 1);
    const cadence = slowFrames.current > 30 ? 3 : quality === 'very_high' ? 0.6 : quality === 'high' ? 1.2 : 2;
    if (probe.elapsed < cadence) return;
    model.getWorldPosition(probe.position);
    if (probe.filtered && probe.position.distanceToSquared(probe.lastPosition) < 1 && probe.elapsed < 4) return;
    let exclude = model;
    for (let parent = model.parent; parent; parent = parent.parent) {
      if (parent.userData.reflectionVehicle === true) { exclude = parent; break; }
    }
    const visible = exclude.visible, background = scene.background, shadowAutoUpdate = gl.shadowMap.autoUpdate;
    // Capture opaque scenery; reuse the main sun shadow map rather than doing six shadow renders.
    exclude.visible = false; scene.background = probe.sky; gl.shadowMap.autoUpdate = false;
    // The same photographed distance LOD supplies foliage to the six low-resolution faces.
    probe.captureObjects.length=0;probe.captureVisibility.length=0;
    scene.traverse(probe.selectCaptureDetail);
    probe.camera.position.copy(probe.position);
    probe.camera.position.y += 0.8;
    try {
      probe.camera.update(gl, scene);
      probe.filtered = probe.generator.fromCubemap(probe.cube.texture, probe.filtered ?? undefined);
      for (const material of probe.materials) {
        if (material.envMap !== probe.filtered.texture) { material.envMap = probe.filtered.texture; material.needsUpdate = true; }
      }
      probe.lastPosition.copy(probe.position); probe.elapsed = 0;
    } finally {
      for(let i=0;i<probe.captureObjects.length;i++)probe.captureObjects[i].visible=probe.captureVisibility[i];
      exclude.visible = visible; scene.background = background; gl.shadowMap.autoUpdate = shadowAutoUpdate;
    }
  });
}
