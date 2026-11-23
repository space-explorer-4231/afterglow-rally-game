import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group, Object3D, PerspectiveCamera, Shape } from 'three';
import { useGameStore } from '@/store/gameStore';
import { useMultiplayerStore } from '@/store/multiplayerStore';
import { useSettingsStore } from '@/store/settingsStore';
import { isLookBackActive } from '@/hooks/useInput';
import type { CameraMode, GameState } from '@/types/game';

/** Whether the optional driver-seat cabin should be rendered over the exterior. */
export function isDriverCabinVisible(mode: CameraMode, state: GameState, spectating: boolean): boolean {
  return mode === 'first_person' && (state === 'playing' || state === 'paused') && !spectating;
}

/** Original shared cabin for the exterior-only car assets; never alters their physics. */
export function DriverCockpit({ wheelsRef }: { wheelsRef: React.RefObject<(Object3D | null)[]> }) {
  const mode = useGameStore(s => s.cameraMode);
  const state = useGameStore(s => s.gameState);
  const spectating = useMultiplayerStore(s => s.isSpectating);
  return isDriverCabinVisible(mode, state, spectating) ? <CabinInterior wheelsRef={wheelsRef} /> : null;
}

function CabinInterior({ wheelsRef }: { wheelsRef: React.RefObject<(Object3D | null)[]> }) {
  const group = useRef<Group>(null);
  const surround = useRef<Group>(null);
  const rpmNeedle = useRef<Group>(null);
  const speedNeedle = useRef<Group>(null);
  const steeringWheel = useRef<Group>(null);
  const quality = useSettingsStore(s => s.graphicsQuality);
  const segments = quality === 'low' ? 24 : 48;
  const dashboard = useMemo(() => {
    const shape = new Shape();
    shape.moveTo(-1.08, -.27);
    shape.lineTo(-1.08, -.02);
    shape.quadraticCurveTo(-.72, .12, -.35, .07);
    shape.quadraticCurveTo(.28, .02, 1.08, .04);
    shape.lineTo(1.08, -.27);
    shape.closePath();
    return shape;
  }, []);

  const pillars = useMemo(() => {
    return [-1, 1].map(side => {
      const shape = new Shape();
      const center = .15;
      shape.moveTo(center + side * .99, -.43);
      shape.lineTo(center + side * .91, -.43);
      shape.quadraticCurveTo(center + side * .81, .04, center + side * .69, .49);
      shape.lineTo(center + side * .745, .49);
      shape.quadraticCurveTo(center + side * .87, .04, center + side * .99, -.43);
      shape.closePath();
      return shape;
    });
  }, []);
  const roofEdge = useMemo(() => {
    const shape = new Shape();
    shape.moveTo(-.60, .49);
    shape.quadraticCurveTo(.15, .57, .90, .49);
    shape.lineTo(.90, .56);
    shape.quadraticCurveTo(.15, .65, -.60, .56);
    shape.closePath();
    return shape;
  }, []);

  useFrame(({ camera }, delta) => {
    if (!group.current) return;
    group.current.position.copy(camera.position);
    group.current.quaternion.copy(camera.quaternion);
    group.current.visible = !isLookBackActive();
    if (surround.current && camera instanceof PerspectiveCamera) {
      // Preserve both windshield corners on narrow displays without distorting the wheel.
      surround.current.scale.x = Math.min(1, camera.aspect / 1.7);
    }
    const telemetry = useGameStore.getState();
    const blend = 1 - Math.exp(-Math.min(delta, .1) * 10);
    if (steeringWheel.current) {
      const angle = wheelsRef.current[0]?.rotation.y ?? 0;
      steeringWheel.current.rotation.z += (-angle * 2.8 - steeringWheel.current.rotation.z) * blend;
    }
    if (rpmNeedle.current) {
      const target = 2.25 - Math.min(1, Math.max(0, telemetry.rpm / 8500)) * 4.5;
      rpmNeedle.current.rotation.z += (target - rpmNeedle.current.rotation.z) * blend;
    }
    if (speedNeedle.current) {
      const target = 2.25 - Math.min(1, Math.max(0, telemetry.speed / 340)) * 4.5;
      speedNeedle.current.rotation.z += (target - speedNeedle.current.rotation.z) * blend;
    }
  });

  return <group ref={group}>
    <group ref={surround}>
    {/* A broad windshield aperture stays clear; the edges show the seated position. */}
    <mesh position={[.15, -.43, -1.23]}>
      <extrudeGeometry args={[dashboard, { depth: .14, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: .025, bevelThickness: .025 }]} />
      <meshStandardMaterial color="#30342e" roughness={.86} />
    </mesh>
    <mesh position={[.15, -.49, -1.055]}>
      <boxGeometry args={[2.08, .025, .025]} />
      <meshStandardMaterial color="#7c806d" metalness={.55} roughness={.38} />
    </mesh>
    {/* Tapered fabric-clad pillars curve into a narrow padded roof edge. */}
    {pillars.map((shape, i) => <mesh key={i} position={[0, 0, -1.18]}>
      <extrudeGeometry args={[shape, { depth: .065, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: .012, bevelThickness: .012 }]} />
      <meshStandardMaterial color="#53584c" roughness={.94} />
    </mesh>)}
    <mesh position={[0, 0, -1.18]}>
      <extrudeGeometry args={[roofEdge, { depth: .075, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: .014, bevelThickness: .014 }]} />
      <meshStandardMaterial color="#53584c" roughness={.94} />
    </mesh>
    {/* Side-window sills, roof rails and rear posts surround transparent openings. */}
    {[-.86, 1.16].map((x, side) => <group key={side}>
      <mesh position={[x, -.38, -.24]} rotation={[0, side === 0 ? -.07 : .07, 0]}>
        <boxGeometry args={[.045, .045, 1.62]} />
        <meshStandardMaterial color="#555d54" roughness={.8} />
      </mesh>
      <mesh position={[x, .48, -.12]}>
        <boxGeometry args={[.045, .045, 1.65]} />
        <meshStandardMaterial color="#53584c" roughness={.9} />
      </mesh>
      <mesh position={[x, .04, .58]}>
        <boxGeometry args={[.045, .88, .055]} />
        <meshStandardMaterial color="#53584c" roughness={.9} />
      </mesh>
      <mesh position={[x, -.34, -.26]}>
        <boxGeometry args={[.08, .3, 1.45]} />
        <meshStandardMaterial color="#3c453d" roughness={.84} />
      </mesh>
    </group>)}
    </group>
    {/* Compact analog instruments remain below the driving sight line. */}
    {[-.115, .115].map((x, i) => <group key={i} position={[x, -.32, -1.01]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[.102, .106, .025, segments]} />
        <meshStandardMaterial color="#d6d5bd" metalness={.28} roughness={.44} />
      </mesh>
      <mesh position={[0, 0, .017]}>
        <circleGeometry args={[.087, segments]} />
        <meshBasicMaterial color="#23352c" />
      </mesh>
      <group ref={i === 0 ? rpmNeedle : speedNeedle} position={[0, 0, .021]}>
        <mesh position={[0, .032, 0]}>
          <boxGeometry args={[.006, .075, .004]} />
          <meshBasicMaterial color="#edbd63" />
        </mesh>
      </group>
    </group>)}
    <group ref={steeringWheel} position={[0, -.36, -.85]} rotation={[-.16, 0, 0]}>
      <mesh>
        <torusGeometry args={[.14, .017, 10, segments]} />
        <meshStandardMaterial color="#252e27" roughness={.8} />
      </mesh>
      <mesh>
        <boxGeometry args={[.235, .018, .023]} />
        <meshStandardMaterial color="#8b9387" metalness={.65} roughness={.34} />
      </mesh>
      <mesh position={[0, -.055, 0]} rotation={[0, 0, -.22]}>
        <boxGeometry args={[.018, .12, .023]} />
        <meshStandardMaterial color="#8b9387" metalness={.65} roughness={.34} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[.035, .035, .026, 24]} />
        <meshStandardMaterial color="#414b40" roughness={.65} />
      </mesh>
    </group>
  </group>;
}
