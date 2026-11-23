import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { BufferGeometry, BufferAttribute, ShaderMaterial, Points, Vector3 } from 'three';
import type { Object3D } from 'three';
import { useGameStore } from '@/store/gameStore';
import { useSettingsStore } from '@/store/settingsStore';
import { getVehiclePreset } from '@/config/vehicleRegistry';
import { getAllRemoteVehicleMeshes } from './remoteVehicleRegistry';
import { isMobileDevice } from '@/utils/device';

const vertexShader = `attribute float smokeSize; attribute float smokeAlpha;
varying float vAlpha; varying float vSeed;
void main(){vec4 mv=modelViewMatrix*vec4(position,1.);vAlpha=smokeAlpha;
vSeed=position.x*.23+position.z*.17;
gl_PointSize=clamp(smokeSize*340./max(2.,-mv.z),1.,110.);gl_Position=projectionMatrix*mv;}`;
const fragmentShader = `varying float vAlpha; varying float vSeed;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1)),f.x),f.y);}
void main(){vec2 p=gl_PointCoord*2.-1.;float n=noise(p*4.+vSeed)*.6+noise(p*9.-vSeed)*.4;
float cloud=smoothstep(1.,.2,length(p)+n*.25);float alpha=cloud*vAlpha*.29;
if(alpha<.005)discard;vec3 color=mix(vec3(.37,.42,.46),vec3(.8,.84,.86),gl_PointCoord.y*.6+n*.4);
gl_FragColor=vec4(color,alpha);
#include <tonemapping_fragment>
#include <colorspace_fragment>}`;

/** One bounded GPU smoke field shared by every player. Remote cars never run rigid-body solvers. */
export function TireSmokeField({ wheelsRef }: { wheelsRef: React.RefObject<(Object3D | null)[]> }) {
  const quality = useSettingsStore(s => s.graphicsQuality);
  const capacity = isMobileDevice() || quality === 'low' ? 128 : quality === 'medium' ? 256 : 512;
  const field = useMemo(() => {
    const positions = new Float32Array(capacity * 3), velocities = new Float32Array(capacity * 3);
    const ages = new Float32Array(capacity).fill(10), sizes = new Float32Array(capacity), alpha = new Float32Array(capacity);
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(positions, 3));
    geometry.setAttribute('smokeSize', new BufferAttribute(sizes, 1));
    geometry.setAttribute('smokeAlpha', new BufferAttribute(alpha, 1));
    const material = new ShaderMaterial({ vertexShader, fragmentShader, transparent: true, depthWrite: false });
    const points = new Points(geometry, material); points.frustumCulled = false; points.renderOrder = 3;
    return { positions, velocities, ages, sizes, alpha, geometry, material, points, head: 0, point: new Vector3() };
  }, [capacity]);
  const accumulator = useRef(0);
  const emitRemote = useMemo(() => (object: Object3D) => {
    const { smokeBurnout, smokeDrift, smokeMode, vehicleId } = object.userData;
    if ((!smokeBurnout && !smokeDrift) || !object.visible || typeof vehicleId !== 'string') return;
    const preset = getVehiclePreset(vehicleId);
    for (let i = 0; i < 4; i++) {
      if (smokeBurnout && (smokeMode === 'FWD' ? i > 1 : smokeMode === 'RWD' ? i < 2 : false)) continue;
      const w = preset.config.wheels[i];
      field.point.set(w.position[0], w.position[1] - w.suspensionRestLength - w.radius, w.position[2]);
      field.point.applyMatrix4(object.matrixWorld);
      emitSmoke(field, capacity, field.point);
    }
  }, [field, capacity]);
  useEffect(() => () => { field.geometry.dispose(); field.material.dispose(); }, [field]);
  useFrame((_, delta) => {
    if (useGameStore.getState().gameState !== 'playing') return;
    const dt = Math.min(0.05, Math.max(0, delta));
    const state = useGameStore.getState();
    accumulator.current += dt;
    if (accumulator.current >= 0.07) {
      accumulator.current = 0;
      if (!state.isAirborne && state.surface === 'tarmac') {
        for (let i = 0; i < 4; i++) {
          const wheel = wheelsRef.current[i];
          if (!wheel || wheel.userData.isGrounded === false) continue;
          if (state.wheelSlip[i] < 3 && !(Math.abs(state.slipAngle) > 0.2 && state.speed > 18)) continue;
          wheel.getWorldPosition(field.point); field.point.y -= 0.32;
          emitSmoke(field, capacity, field.point);
        }
      }
      getAllRemoteVehicleMeshes().forEach(emitRemote);
    }
    for (let i = 0; i < capacity; i++) {
      field.ages[i] += dt;
      if (field.ages[i] >= 2.8) { field.alpha[i] = 0; continue; }
      const age = field.ages[i], offset = i * 3;
      field.positions[offset] += field.velocities[offset] * dt;
      field.positions[offset + 1] += (field.velocities[offset + 1] + age * 0.16) * dt;
      field.positions[offset + 2] += field.velocities[offset + 2] * dt;
      field.sizes[i] = 0.7 + age * 1.65;
      field.alpha[i] = Math.min(1, age * 8) * Math.pow(1 - age / 2.8, 1.5);
    }
    field.geometry.attributes.position.needsUpdate = true;
    field.geometry.attributes.smokeSize.needsUpdate = true;
    field.geometry.attributes.smokeAlpha.needsUpdate = true;
  });
  return <primitive object={field.points} />;
}

function emitSmoke(field: { head: number; positions: Float32Array; velocities: Float32Array; ages: Float32Array }, capacity: number, position: Vector3): void {
  const i = field.head, o = i * 3; field.head = (i + 1) % capacity;
  field.positions[o] = position.x; field.positions[o + 1] = position.y + 0.2; field.positions[o + 2] = position.z;
  field.velocities[o] = (Math.random() - 0.5) * 0.9;
  field.velocities[o + 1] = 0.5 + Math.random() * 0.5;
  field.velocities[o + 2] = (Math.random() - 0.5) * 0.9;
  field.ages[i] = 0;
}
