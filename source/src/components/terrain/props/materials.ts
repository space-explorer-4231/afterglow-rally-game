import {
  Color,
  DoubleSide,
  FrontSide,
  MeshLambertMaterial,
  type Texture,
  type IUniform,
} from 'three';
import { isMobileDevice } from '@/utils/device';

/**
 * Creates custom foliage material with GPU wind displacement shader.
 */
export function createFoliageWindMaterial(
  tex: Texture,
  baseColor: string,
  isBroadleaf: boolean,
  registerUniforms: (uniforms: Record<string, IUniform>) => void,
): MeshLambertMaterial {
    const isMobile = isMobileDevice();
  const mat = new MeshLambertMaterial({
    map: tex,
    side: isMobile ? FrontSide : DoubleSide,
    alphaTest: isMobile ? 0 : 0.12,
    transparent: false,
    depthWrite: true,
    color: new Color(baseColor),
  });

  mat.customProgramCacheKey = () => {
    return `foliage-single-sample-${isBroadleaf ? 'broadleaf' : 'conifer'}-${isMobile ? 'mobile' : 'desktop'}`;
  };

  mat.onBeforeCompile = (shader) => {
    patchFoliageWindShader(shader, isBroadleaf);
    registerUniforms(shader.uniforms);
  };

  return mat;
}

/** Typed shader source accepted by Three and deterministic source-contract checks. */
export interface FoliageColorShader {
  uniforms: Record<string, IUniform>;
  vertexShader: string;
  fragmentShader: string;
}

/** Reuse the standard map sample for luminance cutout rather than fetching it twice. */
export function patchFoliageWindShader(shader: FoliageColorShader, isBroadleaf: boolean): void {
    shader.uniforms.u_time = { value: 0 };

    shader.vertexShader = `
      uniform float u_time;
    ` + shader.vertexShader;

    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      `#include <common>
      varying vec2 vFoliageUv;
      varying float vFoliageCameraDistance;
      `,
    );

    shader.vertexShader = shader.vertexShader.replace(
      '#include <project_vertex>',
      `
      vFoliageUv = uv;
      vec3 displaced = transformed;

      vec4 worldOrigin = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
      float heightFactor = clamp(displaced.y / 4.0, 0.1, 1.0);
      float speed = ${isBroadleaf ? '2.4' : '1.8'};
      float sway = ${isBroadleaf ? '0.06' : '0.038'};
      float breeze = sin(u_time * speed + worldOrigin.x * 0.2 + worldOrigin.z * 0.3) * sway * heightFactor;
      displaced.x += breeze;
      displaced.z += breeze * 0.6;

      vec4 mvPosition = vec4( displaced, 1.0 );
      #ifdef USE_INSTANCING
        mvPosition = instanceMatrix * mvPosition;
      #endif
      mvPosition = modelViewMatrix * mvPosition;
      vFoliageCameraDistance = length(mvPosition.xyz);
      gl_Position = projectionMatrix * mvPosition;
      `,
    );

    shader.fragmentShader = `
      varying vec2 vFoliageUv;
      varying float vFoliageCameraDistance;
    ` + shader.fragmentShader;

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <map_fragment>',
      `
      #include <map_fragment>
      // Keep the chase view readable when it passes through a leaf card.
      // Screen-door coverage preserves opaque depth sorting and needs no CPU raycasts.
      float foliageVisibility = smoothstep(0.6, 4.5, vFoliageCameraDistance);
      if (foliageVisibility < 1.0) {
        float threshold = fract(sin(dot(floor(gl_FragCoord.xy), vec2(12.9898, 78.233))) * 43758.5453);
        if (foliageVisibility < threshold) discard;
      }
      #ifdef USE_MAP
        vec4 fTex = sampledDiffuseColor;
      #else
        vec4 fTex = vec4(1.0);
      #endif

      // Photographic foliage cutout: discard dark background pixels from JPEG texture
      float lum = max(fTex.r, max(fTex.g, fTex.b));
      diffuseColor.a = lum;
      if (lum < 0.08) {
        discard;
      }

      // Branch ambient occlusion (deeper shadow near trunk, sunlit tips)
      float branchAO = mix(0.5, 1.15, vFoliageUv.y);
      // map_fragment already applied the photograph in linear color space.
      // Applying fTex again squared the texture and crushed shaded foliage.
      diffuseColor.rgb *= 1.15 * branchAO;
      `,
    );
}
