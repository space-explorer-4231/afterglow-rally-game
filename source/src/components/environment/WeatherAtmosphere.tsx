import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { BufferAttribute, BufferGeometry, Color, DoubleSide, ShaderMaterial, Vector3 } from 'three';
import { useSettingsStore } from '@/store/settingsStore';
import { useGameStore } from '@/store/gameStore';

interface RainResources {
  geometry: BufferGeometry;
  material: ShaderMaterial;
  lease: number;
  time: { value: number };
  anchor: { value: Vector3 };
  right: { value: Vector3 };
  wind: { value: Vector3 };
}

const VERTEX = /* glsl */ `
  attribute vec3 seed;
  uniform float rainTime;
  uniform vec3 anchor;
  uniform vec3 cameraRight;
  uniform vec3 wind;
  varying vec2 streakUv;
  varying float visibility;
  void main() {
    streakUv = position.xy;
    float speed = mix(0.64, 1.0, seed.z);
    float fall = fract(seed.y - rainTime * speed);
    vec3 center = vec3((seed.x - .5) * 44., fall * 22. - 7., (seed.z - .5) * 44.);
    center.x += sin(seed.z * 31. + rainTime * .6) * .28;
    float streakLength = mix(.55, 1.05, seed.x);
    vec3 drop = center + anchor + cameraRight * position.x * .024;
    drop += vec3(wind.x, 1., wind.z) * position.y * streakLength;
    float distanceFade = 1. - smoothstep(13., 24., length(center.xz));
    float nearFade = smoothstep(.7, 2.8, length(center.xz));
    visibility = distanceFade * nearFade * mix(.34, .65, seed.y);
    gl_Position = projectionMatrix * viewMatrix * vec4(drop, 1.);
  }
`;
const FRAGMENT = /* glsl */ `
  varying vec2 streakUv;
  varying float visibility;
  uniform vec3 rainColor;
  void main() {
    float edge = 1. - smoothstep(.14, .5, abs(streakUv.x));
    float taper = smoothstep(-.5, -.25, streakUv.y) * (1. - smoothstep(.1, .5, streakUv.y));
    float alpha = edge * taper * visibility;
    if (alpha < .015) discard;
    gl_FragColor = vec4(rainColor, alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

/** One GPU rain field: soft tapered streaks, wind and motion response, no gameplay changes. */
export function WeatherAtmosphere() {
  const weather = useSettingsStore(s => s.weatherMode);
  const quality = useSettingsStore(s => s.graphicsQuality);
  const resources = useMemo(() => createRainResources(), []);
  const resourceRef = useRef(resources);
  const previousPosition = useRef(new Vector3());
  const initialized = useRef(false);
  useEffect(() => {
    const lease = ++resourceRef.current.lease;
    return () => {
      // StrictMode replays effects before this microtask; preserve a renewed lease.
      queueMicrotask(() => {
        if (resources.lease === lease) {
          resources.geometry.dispose();
          resources.material.dispose();
        }
      });
    };
  }, [resources]);
  const count = quality === 'low' ? 100 : quality === 'medium' ? 220 : 600;
  useEffect(() => { resources?.geometry.setDrawRange(0, count * 6); }, [resources, count]);

  useFrame(({ camera }, delta) => {
    const live = resourceRef.current;
    if (!live || weather !== 'rain' || useGameStore.getState().gameState !== 'playing') {
      initialized.current = false;
      return;
    }
    const dt = Math.min(Number.isFinite(delta) ? Math.max(delta, 0) : 0, .05);
    live.time.value += dt;
    if (initialized.current && dt > .001) {
      // Apparent slant responds smoothly to vehicle/camera motion; recovery jumps are bounded.
      const vx = Math.max(-60, Math.min(60, (camera.position.x - previousPosition.current.x) / dt));
      const vz = Math.max(-60, Math.min(60, (camera.position.z - previousPosition.current.z) / dt));
      const blend = 1 - Math.exp(-dt * 3);
      live.wind.value.x += (.13 - vx * .012 - live.wind.value.x) * blend;
      live.wind.value.z += (.03 - vz * .012 - live.wind.value.z) * blend;
    }
    live.anchor.value.copy(camera.position);
    live.right.value.setFromMatrixColumn(camera.matrixWorld, 0);
    previousPosition.current.copy(camera.position);
    initialized.current = true;
  });

  return <mesh geometry={resources.geometry} material={resources.material}
    visible={weather === 'rain'} frustumCulled={false} dispose={null} />;
}


function createRainResources(): RainResources {
    const positions = new Float32Array(600 * 6 * 3);
    const seeds = new Float32Array(positions.length);
    const corners = [-.5, -.5, .5, -.5, .5, .5, -.5, -.5, .5, .5, -.5, .5];
    for (let i = 0; i < 600; i++) {
      for (let j = 0; j < 6; j++) {
        const at = i * 18 + j * 3;
        positions[at] = corners[j * 2];
        positions[at + 1] = corners[j * 2 + 1];
        seeds[at] = (i * .754877666 + .13) % 1;
        seeds[at + 1] = (i * .438579 + .37) % 1;
        seeds[at + 2] = (i * .569840296 + .71) % 1;
      }
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(positions, 3));
    geometry.setAttribute('seed', new BufferAttribute(seeds, 3));
    const time = { value: 0 };
    const anchor = { value: new Vector3() };
    const right = { value: new Vector3(1, 0, 0) };
    const wind = { value: new Vector3(.13, 0, .03) };
    const material = new ShaderMaterial({
      uniforms: { rainTime: time, anchor, cameraRight: right, wind, rainColor: { value: new Color('#d7e2e4') } },
      vertexShader: VERTEX, fragmentShader: FRAGMENT,
      transparent: true, depthWrite: false, side: DoubleSide,
    });
    return { lease: 0, geometry, material, time, anchor, right, wind };
}
