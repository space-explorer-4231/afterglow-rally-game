import {isDriveReady} from '@/utils/driveReady';
import { useSettingsStore } from '@/store/settingsStore';
import type { DrivetrainMode } from '@/types/settings';
import { useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import type { RapierRigidBody } from '@react-three/rapier';
import type { Object3D } from 'three';
import { useMultiplayerStore } from '@/store/multiplayerStore';
import { useGameStore } from '@/store/gameStore';
import { useGymkhanaStore } from '@/store/gymkhanaStore';
import { useDriftClubStore } from '@/store/driftClubStore';
import { networkClient } from '@/network/networkClient';
import type { SurfaceType } from '@/types/vehicle';

// Reusable scratch instances for zero-GC useFrame telemetry updates
const _posTuple: [number, number, number] = [0, 0, 0];
const _rotTuple: [number, number, number, number] = [0, 0, 0, 1];
const _linVelTuple: [number, number, number] = [0, 0, 0];
const _angVelTuple: [number, number, number] = [0, 0, 0];
const _wheelYTuple: [number, number, number, number] = [0, 0, 0, 0];
const _wheelRotsTuple: [number, number, number, number] = [0, 0, 0, 0];

const _reusableTelemetryPayload = {
  pos: _posTuple,
  rot: _rotTuple,
  linVel: _linVelTuple,
  angVel: _angVelTuple,
  steer: 0,
  wheelRots: _wheelRotsTuple,
  wheelY: _wheelYTuple,
  rpm: 1000,
  gear: 1,
  isDrifting: false,
  burnout: false,
  nitroActive:false,
  drivetrain: 'AWD' as DrivetrainMode,
  surface: 'tarmac' as SurfaceType,
  score: undefined as number | undefined,
};

/**
 * Dedicated hook that broadcasts the local vehicle transform, velocity, wheel rotations,
 * and driving telemetry to the multiplayer WebSocket server.
 * Decouples netcode transmission from the core vehicle physics simulation with zero heap allocations.
 */
export function useMultiplayerTelemetrySync(
  chassisRef: React.RefObject<RapierRigidBody | null>,
  wheelRefs: React.RefObject<(Object3D | null)[]>,
): void {
  // Notify server when local 3D scene and terrain are fully settled and ready
  useEffect(() => {
    const checkAndSendReady = () => {
      const isReady = isDriveReady(useGameStore.getState());
      const mpStatus = useMultiplayerStore.getState().status;
      if (isReady && mpStatus !== 'disconnected') {
        networkClient.sendClientReady();
      }
    };

    checkAndSendReady();
    const unsub = useGameStore.subscribe((state, prev) => {
      if (isDriveReady(state) && !isDriveReady(prev)) {
        checkAndSendReady();
      }
    });
    const unsubRoom = useMultiplayerStore.subscribe((state, prev) => {
      if (state.selfId !== prev.selfId && state.selfId) checkAndSendReady();
    });
    return () => {unsub(); unsubRoom();};
  }, []);

  useFrame(() => {
    const mpState = useMultiplayerStore.getState();
    if (mpState.status === 'disconnected' || !mpState.currentRoom || mpState.isSpectating) {
      return;
    }

    // Fast interval gate: exit immediately before reading transforms if not ready to transmit
    const now = performance.now();
    const gameStoreState = useGameStore.getState();
    const nitroActive=gameStoreState.gameState==='playing'&&gameStoreState.nitroActive;
    if (!networkClient.canSendTelemetry(now,nitroActive)) {
      return;
    }

    const body = chassisRef.current;
    if (!body || (typeof body.isValid === 'function' && !body.isValid())) {
      return;
    }

    const pos = body.translation();
    const rot = body.rotation();
    const linvel = body.linvel();
    const angvel = body.angvel();

    _posTuple[0] = Number.isFinite(pos.x) ? Math.round(pos.x * 100) / 100 : 0;
    _posTuple[1] = Number.isFinite(pos.y) ? Math.round(pos.y * 100) / 100 : 0;
    _posTuple[2] = Number.isFinite(pos.z) ? Math.round(pos.z * 100) / 100 : 0;

    _rotTuple[0] = Number.isFinite(rot.x) ? Math.round(rot.x * 1000) / 1000 : 0;
    _rotTuple[1] = Number.isFinite(rot.y) ? Math.round(rot.y * 1000) / 1000 : 0;
    _rotTuple[2] = Number.isFinite(rot.z) ? Math.round(rot.z * 1000) / 1000 : 0;
    _rotTuple[3] = Number.isFinite(rot.w) ? Math.round(rot.w * 1000) / 1000 : 1;

    _linVelTuple[0] = Number.isFinite(linvel.x) ? Math.round(linvel.x * 10) / 10 : 0;
    _linVelTuple[1] = Number.isFinite(linvel.y) ? Math.round(linvel.y * 10) / 10 : 0;
    _linVelTuple[2] = Number.isFinite(linvel.z) ? Math.round(linvel.z * 10) / 10 : 0;

    _angVelTuple[0] = Number.isFinite(angvel.x) ? Math.round(angvel.x * 10) / 10 : 0;
    _angVelTuple[1] = Number.isFinite(angvel.y) ? Math.round(angvel.y * 10) / 10 : 0;
    _angVelTuple[2] = Number.isFinite(angvel.z) ? Math.round(angvel.z * 10) / 10 : 0;

    const wheels = wheelRefs.current;
    for(let i=0;i<4;i++){
      const height=wheels?.[i]?.position.y ?? -0.4;
      _wheelYTuple[i]=Math.round(Math.max(-2,Math.min(1,Number.isFinite(height)?height:-0.4))*1000)/1000;
    }
    _wheelRotsTuple[0] = Math.round((wheels?.[0]?.children[0]?.rotation.x ?? 0) * 100) / 100;
    _wheelRotsTuple[1] = Math.round((wheels?.[1]?.children[0]?.rotation.x ?? 0) * 100) / 100;
    _wheelRotsTuple[2] = Math.round((wheels?.[2]?.children[0]?.rotation.x ?? 0) * 100) / 100;
    _wheelRotsTuple[3] = Math.round((wheels?.[3]?.children[0]?.rotation.x ?? 0) * 100) / 100;

    const liveGymkhanaScore =
      gameStoreState.gameMode === 'gymkhana_blitz'
        ? useGymkhanaStore.getState().totalScore + useGymkhanaStore.getState().currentDriftScore
        : gameStoreState.gameMode === 'freeroam' ? useDriftClubStore.getState().score : undefined;

    _reusableTelemetryPayload.steer = Math.round((wheels?.[0]?.rotation.y ?? 0) * 100) / 100;
    _reusableTelemetryPayload.rpm = gameStoreState.rpm;
    _reusableTelemetryPayload.gear = gameStoreState.gear;
    _reusableTelemetryPayload.isDrifting = Math.abs(gameStoreState.slipAngle) > 0.35 && gameStoreState.speed > 15;
    _reusableTelemetryPayload.surface = gameStoreState.surface;
    _reusableTelemetryPayload.burnout = gameStoreState.burnout;
    _reusableTelemetryPayload.nitroActive=nitroActive;
    _reusableTelemetryPayload.drivetrain = useSettingsStore.getState().drivetrainMode;
    _reusableTelemetryPayload.score = liveGymkhanaScore;

    networkClient.sendTelemetry(_reusableTelemetryPayload);
  });
}
