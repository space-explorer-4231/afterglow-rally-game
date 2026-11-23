import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { PerspectiveCamera } from 'three';
import { Vector3, Quaternion, Euler, MathUtils, Object3D } from 'three';
import { getVehiclePreset } from '@/config/vehicleRegistry';
import { driverEyeHeight, setDriverViewRotation } from '@/utils/driverView';
import { useGameStore } from '@/store/gameStore';
import { useMultiplayerStore } from '@/store/multiplayerStore';
import { isLookBackActive } from '@/hooks/useInput';
import { lerp } from '@/utils/math';
import { MIN_FOV, MAX_FOV, MAX_SPEED_FOR_FOV, FOV_SMOOTH_BASE } from '@/config/camera';

const _bodyPos = new Vector3();
const _worldQuat = new Quaternion();
const _offset = new Vector3();
const _driverRotation = new Euler(0, 0, 0, 'YXZ');
const _driverQuat = new Quaternion();

// Pre-allocated rotation constants to eliminate per-frame GC allocations
const _pitchDownQuat = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -0.07);
const _y180Quat = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI);

// Offset for the hood view (moved back and up to see the hood)
const BUMPER_OFFSET = new Vector3(0, 1.1, 0.5); 

/**
 * Bumper/Hood camera hook — attaches firmly to the vehicle
 * and rotates exactly with the car's pitch, yaw, and roll.
 *
 * @param targetRef - Ref to the vehicle's visual mesh
 */
export function useBumperCamera(targetRef: React.RefObject<Object3D | null>): void {
  const { camera } = useThree();
  const currentFovRef = useRef(MIN_FOV);
  const cameraMode = useGameStore((s) => s.cameraMode);
  const vehicleId = useGameStore((s) => s.selectedVehicleId);
  const chassis = getVehiclePreset(vehicleId).config.chassisSize;
  const eyeHeight = driverEyeHeight(chassis[1]);


  useFrame((_, delta) => {
    const gameState = useGameStore.getState().gameState;
    if (useMultiplayerStore.getState().isSpectating) return;
    if (!targetRef.current || (cameraMode !== 'bumper' && cameraMode !== 'first_person') || gameState !== 'playing') return;

    const target = targetRef.current;
    const speed = useGameStore.getState().speed;

    // Get interpolated world position and full rotation of the visual mesh
    target.getWorldPosition(_bodyPos);
    target.getWorldQuaternion(_worldQuat);

    if (
      !Number.isFinite(_bodyPos.x) ||
      !Number.isFinite(_bodyPos.y) ||
      !Number.isFinite(_bodyPos.z) ||
      !Number.isFinite(_worldQuat.x) ||
      !Number.isFinite(_worldQuat.y) ||
      !Number.isFinite(_worldQuat.z) ||
      !Number.isFinite(_worldQuat.w)
    ) {
      return;
    }

    const lookBack = isLookBackActive();

    if (cameraMode === 'first_person') {
      // Seated left-hand driver position. A consistent original cabin is rendered
      // separately because the imported exterior models have incompatible interiors.
      _offset.set(-chassis[0] * 0.16, eyeHeight, -chassis[2] * 0.06).applyQuaternion(_worldQuat);
      camera.position.copy(_bodyPos).add(_offset);
      setDriverViewRotation(_worldQuat, _driverQuat, _driverRotation, lookBack);
      camera.quaternion.copy(_driverQuat);
    } else if (lookBack) {
      // Move camera to front of car, slightly higher, and look backwards (down local -Z)
      _offset.set(0, 1.1, 3.5).applyQuaternion(_worldQuat);
      camera.position.copy(_bodyPos).add(_offset);
      
      // Zero allocations: use module-level constant
      camera.quaternion.copy(_worldQuat).multiply(_pitchDownQuat);
    } else {
      // Normal bumper camera
      _offset.copy(BUMPER_OFFSET).applyQuaternion(_worldQuat);
      camera.position.copy(_bodyPos).add(_offset);

      // Zero allocations: use module-level constants
      camera.quaternion.copy(_worldQuat).multiply(_y180Quat).multiply(_pitchDownQuat);
    }

    // Dynamic FOV based on speed (higher sense of speed in bumper mode)
    // We increase max FOV slightly for bumper to enhance speed sensation
    const bumperMaxFov = cameraMode === 'first_person' ? MAX_FOV : MAX_FOV + 10;
    const safeSpeed = Number.isFinite(speed) ? Math.max(0, speed) : 0;
    const safeDelta = Number.isFinite(delta) && delta > 0 ? Math.min(delta, 0.1) : 1 / 60;
    
    const targetFov = cameraMode === 'first_person' ? 68 : lerp(
      MIN_FOV,
      bumperMaxFov,
      Math.min(safeSpeed / MAX_SPEED_FOR_FOV, 1),
    );
    
    currentFovRef.current = MathUtils.lerp(
      currentFovRef.current,
      targetFov,
      1 - Math.pow(FOV_SMOOTH_BASE, safeDelta * 60),
    );

    // Apply FOV and update projection matrix only when delta is significant to avoid scene graph churn
    if ('fov' in camera && Number.isFinite(currentFovRef.current)) {
      const persCamera = camera as PerspectiveCamera;
      if (Math.abs(persCamera.fov - currentFovRef.current) > 0.02) {
        persCamera.fov = currentFovRef.current;
        persCamera.updateProjectionMatrix();
      }
    }
  });
}
