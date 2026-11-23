import { describe, expect, it } from 'vitest';
import { ShaderChunk, ShaderLib, UniformsUtils } from 'three';
import { patchFoliageWindShader } from '../materials';

describe('single-sample foliage color shader', () => {
  it.each([false, true])('patches the actual Lambert source for broadleaf=%s without a second texture fetch', broadleaf => {
    const shader = {
      uniforms: UniformsUtils.clone(ShaderLib.lambert.uniforms),
      vertexShader: ShaderLib.lambert.vertexShader,
      fragmentShader: ShaderLib.lambert.fragmentShader,
    };
    patchFoliageWindShader(shader, broadleaf);
    const expandedMap = shader.fragmentShader.replace('#include <map_fragment>', ShaderChunk.map_fragment);
    expect(expandedMap.match(/texture2D\(\s*map\s*,/g)).toHaveLength(1);
    expect(expandedMap).not.toContain('texture2D(u_tex');
    expect(expandedMap.indexOf('vec4 sampledDiffuseColor')).toBeLessThan(expandedMap.indexOf('vec4 fTex = sampledDiffuseColor'));
    expect(expandedMap.indexOf('if (lum < 0.08)')).toBeLessThan(expandedMap.indexOf('#include <alphatest_fragment>'));
    expect(expandedMap).toContain('diffuseColor.rgb *= 1.15 * branchAO');
    expect(expandedMap).toContain('smoothstep(0.6, 4.5, vFoliageCameraDistance)');
    expect(shader.vertexShader).toContain('instanceMatrix * mvPosition');
    expect(shader.uniforms.u_time.value).toBe(0);
  });
});
