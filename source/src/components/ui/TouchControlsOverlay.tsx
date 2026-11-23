import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { useSettingsStore } from '@/store/settingsStore';
import { useGameStore } from '@/store/gameStore';
import {
  setTouchInput,
  resetTouchInputState,
  getLastInputType,
  isTouchDevice,
  triggerHapticFeedback,
  calculateJoystickSteering,
  calculateDigitalSteering,
  JOYSTICK_BASE_RADIUS,
  JOYSTICK_DEADZONE_RATIO,
  type InputType,
} from '@/utils/input/touch';
import {
  startTiltSensorListener,
  isIosMotionPermissionRequired,
  getTiltPermissionState,
  requestTiltPermission,
  setTiltTouchOverride,
} from '@/utils/input/tilt';

import type {
  TouchControlMode,
  TouchSteeringScheme,
  TouchButtonSize,
} from '@/types';

export interface TouchControlsOverlayProps {
  /** Optional override to force visibility regardless of input mode (useful for testing/previews) */
  forceVisible?: boolean;
  touchControlMode?: TouchControlMode;
  touchSteeringScheme?: TouchSteeringScheme;
  touchOpacity?: number;
  touchButtonSize?: TouchButtonSize;
  touchHaptics?: boolean;
}

interface JoystickCoords {
  x: number;
  y: number;
}

export const TouchControlsOverlay: React.FC<TouchControlsOverlayProps> = memo(function TouchControlsOverlay({
  forceVisible,
  touchControlMode: propMode,
  touchSteeringScheme: propScheme,
  touchOpacity: propOpacity,
  touchButtonSize: propSize,
  touchHaptics: propHaptics,
}) {
  const storeMode = useSettingsStore((s) => s.touchControlMode);
  const storeScheme = useSettingsStore((s) => s.touchSteeringScheme);
  const storeOpacity = useSettingsStore((s) => s.touchOpacity);
  const storeSize = useSettingsStore((s) => s.touchButtonSize);
  const storeHaptics = useSettingsStore((s) => s.touchHaptics);
  const transmissionMode = useSettingsStore((s) => s.transmissionMode);

  const effectiveMode = useSettingsStore.getState().touchControlMode ?? storeMode;
  const effectiveScheme = useSettingsStore.getState().touchSteeringScheme ?? storeScheme;
  const effectiveOpacity = useSettingsStore.getState().touchOpacity ?? storeOpacity;
  const effectiveSize = useSettingsStore.getState().touchButtonSize ?? storeSize;
  const effectiveHaptics = useSettingsStore.getState().touchHaptics ?? storeHaptics;

  const touchControlMode = propMode ?? effectiveMode;
  const touchSteeringScheme = propScheme ?? effectiveScheme;
  const touchOpacity = propOpacity ?? effectiveOpacity;
  const touchButtonSize = propSize ?? effectiveSize;
  const touchHaptics = propHaptics ?? effectiveHaptics;

  const cycleCameraMode = useGameStore((s) => s.cycleCameraMode);
  const setGameState = useGameStore((s) => s.setGameState);

  const [activeInputType, setActiveInputType] = useState<InputType>(() => getLastInputType());

  // Joystick state
  const [joystickOrigin, setJoystickOrigin] = useState<JoystickCoords | null>(null);
  const [joystickKnob, setJoystickKnob] = useState<JoystickCoords | null>(null);
  const joystickPointerIdRef = useRef<number | null>(null);
  const joystickKnobRef = useRef<HTMLDivElement>(null);

  // Digital button state (for buttons scheme)
  const [leftSteerPressed, setLeftSteerPressed] = useState(false);
  const [rightSteerPressed, setRightSteerPressed] = useState(false);
  const leftSteerRef = useRef(false);
  const rightSteerRef = useRef(false);

  // Pedal state
  const [throttlePressed, setThrottlePressed] = useState(false);
  const [brakePressed, setBrakePressed] = useState(false);
  const [handbrakePressed, setHandbrakePressed] = useState(false);
  const [nitroPressed,setNitroPressed]=useState(false);

  // Start tilt listener when tilt steering is selected and auto-request iOS permission on first gesture
  useEffect(() => {
    if (touchSteeringScheme !== 'tilt') return;

    const cleanup = startTiltSensorListener();

    // On iOS 13+, motion sensor permission must be requested via user gesture.
    // If not yet granted, request it automatically on the first user interaction.
    let cleanupPointer: (() => void) | undefined;
    if (isIosMotionPermissionRequired() && getTiltPermissionState() !== 'granted') {
      const handleFirstInteraction = async () => {
        const res = await requestTiltPermission();
        if (res === 'granted' && touchHaptics) {
          triggerHapticFeedback(20);
        }
      };
      window.addEventListener('pointerdown', handleFirstInteraction, { once: true });
      cleanupPointer = () => {
        window.removeEventListener('pointerdown', handleFirstInteraction);
      };
    }

    return () => {
      cleanup();
      cleanupPointer?.();
      setTiltTouchOverride(false);
    };
  }, [touchSteeringScheme, touchHaptics]);

  // Listen to input type switches across window
  useEffect(() => {
    const handleInputSwitch = (e?: Event) => {
      if (e && 'detail' in e && typeof (e as CustomEvent).detail?.modality === 'string') {
        setActiveInputType((e as CustomEvent).detail.modality);
      } else {
        setActiveInputType(getLastInputType());
      }
    };

    window.addEventListener('pointerdown', handleInputSwitch, { passive: true });
    window.addEventListener('touchstart', handleInputSwitch, { passive: true });
    window.addEventListener('keydown', handleInputSwitch, { passive: true });
    window.addEventListener('openrally-input-switch', handleInputSwitch as EventListener);

    return () => {
      window.removeEventListener('pointerdown', handleInputSwitch);
      window.removeEventListener('touchstart', handleInputSwitch);
      window.removeEventListener('keydown', handleInputSwitch);
      window.removeEventListener('openrally-input-switch', handleInputSwitch as EventListener);
    };
  }, []);

  // Cleanup inputs on unmount
  useEffect(() => {
    const releaseNitro=()=>{setNitroPressed(false);setTouchInput({nitro:false});};
    const hideNitro=()=>{if(document.hidden)releaseNitro();};
    window.addEventListener('blur',releaseNitro);
    document.addEventListener('visibilitychange',hideNitro);
    return () => {
      window.removeEventListener('blur',releaseNitro);
      document.removeEventListener('visibilitychange',hideNitro);
      resetTouchInputState();
    };
  }, []);

  // Determine visibility
  const effectiveInputType = getLastInputType() || activeInputType;
  const isVisible =
    forceVisible ??
    (touchControlMode === 'always' ||
      (touchControlMode === 'auto' &&
        (effectiveInputType === 'touch' || isTouchDevice()) &&
        effectiveInputType !== 'keyboard' &&
        effectiveInputType !== 'gamepad'));

  // Calculate size multiplier
  const sizeMultiplier =
    touchButtonSize === 'small' ? 0.85 : touchButtonSize === 'large' ? 1.15 : 1.0;

  // --------------------------------------------------------------------------
  // Floating Joystick Handlers
  // --------------------------------------------------------------------------
  const handleJoystickPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (joystickPointerIdRef.current !== null) return;
      joystickPointerIdRef.current = e.pointerId;
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // Pointer capture not supported or rejected
      }

      const origin = { x: e.clientX, y: e.clientY };
      setJoystickOrigin(origin);
      setJoystickKnob(origin);

      const result = calculateJoystickSteering(
        origin.x,
        e.clientX,
        JOYSTICK_BASE_RADIUS,
        JOYSTICK_DEADZONE_RATIO
      );
      setTouchInput({ steering: result.steering });
      if (touchHaptics) triggerHapticFeedback(10);
    },
    [touchHaptics]
  );

  const handleJoystickPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (joystickPointerIdRef.current !== e.pointerId || !joystickOrigin) return;

      const deltaX = e.clientX - joystickOrigin.x;
      const deltaY = e.clientY - joystickOrigin.y;
      const dist = Math.hypot(deltaX, deltaY);

      let knobOffsetX = deltaX;
      let knobOffsetY = deltaY;
      if (dist > JOYSTICK_BASE_RADIUS) {
        knobOffsetX = (deltaX / dist) * JOYSTICK_BASE_RADIUS;
        knobOffsetY = (deltaY / dist) * JOYSTICK_BASE_RADIUS;
      }

      // Direct DOM mutation on the knob avoids re-rendering the entire 724-line overlay at 120-240Hz
      if (joystickKnobRef.current) {
        joystickKnobRef.current.style.transform = `translate3d(${knobOffsetX}px, ${knobOffsetY}px, 0)`;
      }

      const result = calculateJoystickSteering(
        joystickOrigin.x,
        e.clientX,
        JOYSTICK_BASE_RADIUS,
        JOYSTICK_DEADZONE_RATIO
      );
      setTouchInput({ steering: result.steering });
    },
    [joystickOrigin]
  );

  const handleJoystickPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (joystickPointerIdRef.current !== e.pointerId) return;
      joystickPointerIdRef.current = null;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // Ignore
      }
      setJoystickOrigin(null);
      setJoystickKnob(null);
      setTouchInput({ steering: 0 });
    },
    []
  );

  // --------------------------------------------------------------------------
  // Digital Buttons Handlers (Scheme: buttons)
  // --------------------------------------------------------------------------
  const handleLeftSteerDown = useCallback(
    (e: React.PointerEvent) => {
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {}
      leftSteerRef.current = true;
      setLeftSteerPressed(true);
      if (touchHaptics) triggerHapticFeedback(10);
      setTouchInput({
        steering: calculateDigitalSteering(true, rightSteerRef.current),
      });
    },
    [touchHaptics]
  );

  const handleLeftSteerUp = useCallback(
    (e: React.PointerEvent) => {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
      leftSteerRef.current = false;
      setLeftSteerPressed(false);
      setTouchInput({
        steering: calculateDigitalSteering(false, rightSteerRef.current),
      });
    },
    []
  );

  const handleRightSteerDown = useCallback(
    (e: React.PointerEvent) => {
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {}
      rightSteerRef.current = true;
      setRightSteerPressed(true);
      if (touchHaptics) triggerHapticFeedback(10);
      setTouchInput({
        steering: calculateDigitalSteering(leftSteerRef.current, true),
      });
    },
    [touchHaptics]
  );

  const handleRightSteerUp = useCallback(
    (e: React.PointerEvent) => {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
      rightSteerRef.current = false;
      setRightSteerPressed(false);
      setTouchInput({
        steering: calculateDigitalSteering(leftSteerRef.current, false),
      });
    },
    []
  );

  // --------------------------------------------------------------------------
  // Pedal Handlers (Throttle, Brake, Handbrake)
  // --------------------------------------------------------------------------
  const handleThrottleDown = useCallback(
    (e: React.PointerEvent) => {
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {}
      setThrottlePressed(true);
      if (touchHaptics) triggerHapticFeedback(15);
      setTouchInput({ throttle: 1.0 });
    },
    [touchHaptics]
  );

  const handleThrottleUp = useCallback(
    (e: React.PointerEvent) => {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
      setThrottlePressed(false);
      setTouchInput({ throttle: 0.0 });
    },
    []
  );

  const handleBrakeDown = useCallback(
    (e: React.PointerEvent) => {
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {}
      setBrakePressed(true);
      if (touchHaptics) triggerHapticFeedback(15);
      setTouchInput({ brake: 1.0 });
    },
    [touchHaptics]
  );

  const handleBrakeUp = useCallback(
    (e: React.PointerEvent) => {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
      setBrakePressed(false);
      setTouchInput({ brake: 0.0 });
    },
    []
  );

  const handleHandbrakeDown = useCallback(
    (e: React.PointerEvent) => {
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {}
      e.stopPropagation();
      setHandbrakePressed(true);
      if (touchHaptics) triggerHapticFeedback(25);
      setTouchInput({ handbrake: true });
    },
    [touchHaptics]
  );

  const handleHandbrakeUp = useCallback(
    (e: React.PointerEvent) => {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
      e.stopPropagation();
      setHandbrakePressed(false);
      setTouchInput({ handbrake: false });
    },
    []
  );

  // --------------------------------------------------------------------------
  // Top Utility Handlers (Pause, Reset, Camera)
  // --------------------------------------------------------------------------
  const handlePause = useCallback(() => {
    if (touchHaptics) triggerHapticFeedback(15);
    setTouchInput({ pause: true });
    setGameState('paused');
  }, [touchHaptics, setGameState]);

  const handleResetCar = useCallback(() => {
    if (touchHaptics) triggerHapticFeedback(20);
    setTouchInput({ reset: true });
  }, [touchHaptics]);

  const handleCameraCycle = useCallback(() => {
    if (touchHaptics) triggerHapticFeedback(10);
    setTouchInput({ cameraToggle: true });
    cycleCameraMode();
  }, [touchHaptics, cycleCameraMode]);

  const handleShiftUp = useCallback(() => {
    if (touchHaptics) triggerHapticFeedback(15);
    setTouchInput({ gearUp: true });
  }, [touchHaptics]);

  const handleShiftDown = useCallback(() => {
    if (touchHaptics) triggerHapticFeedback(15);
    setTouchInput({ gearDown: true });
  }, [touchHaptics]);

  if (!isVisible) {
    return null;
  }

  const baseOpacity = Math.max(0.2, Math.min(1.0, touchOpacity));

  return (
    <div
      data-testid="touch-controls-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        pointerEvents: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        touchAction: 'none',
        opacity: baseOpacity,
      }}
    >
      {/* -------------------------------------------------------------------- */}
      {/* Top Utility Buttons Bar */}
      {/* -------------------------------------------------------------------- */}
      <div className="touch-utility-bar"
        style={{
          position: 'absolute',
          top: 'calc(14px + var(--sat, 0px))',
          left: 'calc(16px + var(--sal, 0px))',
          display: 'var(--touch-utility-display,flex)',
          gap: 'var(--touch-utility-gap,10px)',
          pointerEvents: 'auto',
        }}
      >
        {/* Pause Button */}
        <button type="button" data-testid="touch-btn-nitro" aria-label="Hold NOS"
          onPointerDown={e=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);setNitroPressed(true);setTouchInput({nitro:true});}}
          onPointerUp={e=>{if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);setNitroPressed(false);setTouchInput({nitro:false});}}
          onPointerCancel={()=>{setNitroPressed(false);setTouchInput({nitro:false});}}
          onLostPointerCapture={()=>{setNitroPressed(false);setTouchInput({nitro:false});}}
          style={{...utilityBtnStyle,minWidth:54,minHeight:44,background:nitroPressed?'#e9b34d':'rgba(255,244,214,.94)',borderColor:'#b57929',color:'#4b351b'}}>
          NOS
        </button>
        <button
          type="button"
          data-testid="touch-btn-pause"
          aria-label="Pause Game"
          onClick={handlePause}
          style={{
            ...utilityBtnStyle,
            width: `${Math.max(44, Math.round(44 * sizeMultiplier))}px`,
            height: `${Math.max(44, Math.round(44 * sizeMultiplier))}px`,
          }}
        >
          <span style={{ fontSize: '15px', letterSpacing: '1px' }}>❚❚</span>
        </button>

        {/* Reset Car Button */}
        <button
          type="button"
          data-testid="touch-btn-reset"
          aria-label="Reset Vehicle"
          onClick={handleResetCar}
          style={{
            ...utilityBtnStyle,
            width: `${Math.max(44, Math.round(44 * sizeMultiplier))}px`,
            height: `${Math.max(44, Math.round(44 * sizeMultiplier))}px`,
          }}
        >
          <span style={{ fontSize: '18px', fontWeight: 'bold' }}>↺</span>
        </button>

        {/* Camera Toggle Button */}
        <button
          type="button"
          data-testid="touch-btn-camera"
          aria-label="Cycle Camera View"
          onClick={handleCameraCycle}
          style={{
            ...utilityBtnStyle,
            width: `${Math.max(44, Math.round(44 * sizeMultiplier))}px`,
            height: `${Math.max(44, Math.round(44 * sizeMultiplier))}px`,
          }}
        >
          <span style={{ fontSize: '16px' }}>📷</span>
        </button>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* Left Thumb: Steering Area (Joystick or Digital Buttons) */}
      {/* -------------------------------------------------------------------- */}
      {touchSteeringScheme === 'joystick' ? (
        <div
          data-testid="touch-joystick-zone"
          onPointerDown={handleJoystickPointerDown}
          onPointerMove={handleJoystickPointerMove}
          onPointerUp={handleJoystickPointerUp}
          onPointerCancel={handleJoystickPointerUp}
          style={{
            position: 'absolute',
            left: 0,
            bottom: 0,
            width: '45vw',
            height: '60vh',
            pointerEvents: 'auto',
            touchAction: 'none',
          }}
        >
          {/* Subtle resting guide when not touched */}
          {!joystickOrigin && (
            <div
              style={{
                position: 'absolute',
                left: 'calc(40px + var(--sal, 0px))',
                bottom: 'calc(40px + var(--sab, 0px))',
                width: `${JOYSTICK_BASE_RADIUS * 2}px`,
                height: `${JOYSTICK_BASE_RADIUS * 2}px`,
                borderRadius: '50%',
                border: '2px dashed rgba(72, 97, 64, 0.65)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none',
              }}
            >
              <span style={{ fontSize: '11px', color: '#344b32', fontWeight: 600 }}>
                STEER
              </span>
            </div>
          )}

          {/* Active Floating Joystick */}
          {joystickOrigin && joystickKnob && (
            <div
              data-testid="touch-joystick-base"
              style={{
                position: 'fixed',
                left: `${joystickOrigin.x - JOYSTICK_BASE_RADIUS}px`,
                top: `${joystickOrigin.y - JOYSTICK_BASE_RADIUS}px`,
                width: `${JOYSTICK_BASE_RADIUS * 2}px`,
                height: `${JOYSTICK_BASE_RADIUS * 2}px`,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(255,252,242,.9) 0%, rgba(231,237,214,.85) 100%)',
                border: '2px solid rgba(64, 111, 71, 0.8)',
                boxShadow: '0 2px 12px rgba(48, 68, 39, 0.18)',
                pointerEvents: 'none',
              }}
            >
              {/* Central Thumb Knob */}
              <div
                ref={joystickKnobRef}
                data-testid="touch-joystick-knob"
                style={{
                  position: 'fixed',
                  left: `${joystickKnob.x - 22}px`,
                  top: `${joystickKnob.y - 22}px`,
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #92b47a 0%, #52794b 100%)',
                  boxShadow: '0 3px 10px rgba(45, 65, 35, 0.3)',
                  pointerEvents: 'none',
                }}
              />
            </div>
          )}
        </div>
      ) : touchSteeringScheme === 'buttons' ? (
        /* Digital Left / Right Steering Buttons */
        <div
          style={{
            position: 'absolute',
            left: 'calc(24px + var(--sal, 0px))',
            bottom: 'calc(24px + var(--sab, 0px))',
            display: 'flex',
            gap: '12px',
            pointerEvents: 'auto',
          }}
        >
          {/* Steer Left */}
          <button
            type="button"
            data-testid="touch-btn-steer-left"
            aria-label="Steer Left"
            onPointerDown={handleLeftSteerDown}
            onPointerUp={handleLeftSteerUp}
            onPointerCancel={handleLeftSteerUp}
            onPointerLeave={handleLeftSteerUp}
            style={{
              ...steerBtnStyle,
              width: `${Math.round(80 * sizeMultiplier)}px`,
              height: `${Math.round(76 * sizeMultiplier)}px`,
              background: leftSteerPressed
                ? 'rgba(180, 211, 156, 0.95)'
                : 'rgba(255, 251, 237, 0.92)',
              borderColor: leftSteerPressed ? '#426c43' : 'rgba(90, 108, 73, 0.55)',
            }}
          >
            <span style={{ fontSize: '24px' }}>◄</span>
            <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.5px' }}>LEFT</span>
          </button>

          {/* Steer Right */}
          <button
            type="button"
            data-testid="touch-btn-steer-right"
            aria-label="Steer Right"
            onPointerDown={handleRightSteerDown}
            onPointerUp={handleRightSteerUp}
            onPointerCancel={handleRightSteerUp}
            onPointerLeave={handleRightSteerUp}
            style={{
              ...steerBtnStyle,
              width: `${Math.round(80 * sizeMultiplier)}px`,
              height: `${Math.round(76 * sizeMultiplier)}px`,
              background: rightSteerPressed
                ? 'rgba(180, 211, 156, 0.95)'
                : 'rgba(255, 251, 237, 0.92)',
              borderColor: rightSteerPressed ? '#426c43' : 'rgba(90, 108, 73, 0.55)',
            }}
          >
            <span style={{ fontSize: '24px' }}>►</span>
            <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.5px' }}>RIGHT</span>
          </button>
        </div>
      ) : (
        /* Motion Sensor (Tilt) Mode - Left Thumb Placement for Handbrake Drift */
        <div
          style={{
            position: 'absolute',
            left: 'calc(24px + var(--sal, 0px))',
            bottom: 'calc(24px + var(--sab, 0px))',
            zIndex: 10,
            pointerEvents: 'auto',
          }}
        >
          <button
            type="button"
            data-testid="touch-btn-handbrake"
            aria-label="Handbrake Drift"
            onPointerDown={handleHandbrakeDown}
            onPointerUp={handleHandbrakeUp}
            onPointerCancel={handleHandbrakeUp}
            onPointerLeave={handleHandbrakeUp}
            style={{
              ...pedalBaseStyle,
              width: `${Math.round(92 * sizeMultiplier)}px`,
              height: `${Math.round(76 * sizeMultiplier)}px`,
              borderRadius: '20px',
              background: handbrakePressed
                ? 'linear-gradient(180deg, rgba(244,210,143,.97) 0%, rgba(230,179,92,.98) 100%)'
                : 'linear-gradient(180deg, rgba(255,252,241,.94) 0%, rgba(236,235,213,.92) 100%)',
              borderColor: handbrakePressed ? '#a36a25' : 'rgba(163, 106, 37, 0.6)',
              boxShadow: handbrakePressed ? '0 2px 10px rgba(163, 106, 37, 0.25)' : 'none',
            }}
          >
            <span style={{ fontSize: '18px' }}>⚡</span>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#61451d', letterSpacing: '0.5px' }}>
              DRIFT
            </span>
            <span style={{ fontSize: '8px', opacity: 0.7 }}>HANDBRAKE</span>
          </button>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* Right Thumb: Pedals & Handbrake Cluster */}
      {/* -------------------------------------------------------------------- */}
      <div
        style={{
          position: 'absolute',
          right: 'calc(24px + var(--sar, 0px))',
          bottom: 'calc(24px + var(--sab, 0px))',
          display: 'flex',
          alignItems: 'flex-end',
          gap: '14px',
          pointerEvents: 'auto',
        }}
      >
        {/* Brake / Reverse Pedal */}
        <button
          type="button"
          data-testid="touch-pedal-brake"
          aria-label="Brake or Reverse"
          onPointerDown={handleBrakeDown}
          onPointerUp={handleBrakeUp}
          onPointerCancel={handleBrakeUp}
          onPointerLeave={handleBrakeUp}
          style={{
            ...pedalBaseStyle,
            width: `${Math.round(76 * sizeMultiplier)}px`,
            height: `${Math.round(92 * sizeMultiplier)}px`,
            background: brakePressed
              ? 'linear-gradient(180deg, rgba(243,199,173,.97) 0%, rgba(222,164,137,.98) 100%)'
              : 'linear-gradient(180deg, rgba(255,252,241,.94) 0%, rgba(236,235,213,.92) 100%)',
            borderColor: brakePressed ? '#995438' : 'rgba(153, 84, 56, 0.65)',
            boxShadow: brakePressed ? '0 2px 10px rgba(153, 84, 56, 0.25)' : 'none',
          }}
        >
          <span style={{ fontSize: '20px' }}>▼</span>
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#793f2b' }}>BRAKE</span>
          <span style={{ fontSize: '9px', opacity: 0.7 }}>REV</span>
        </button>

        {/* Throttle Pedal (Gas) */}
        <button
          type="button"
          data-testid="touch-pedal-throttle"
          aria-label="Accelerate"
          onPointerDown={handleThrottleDown}
          onPointerUp={handleThrottleUp}
          onPointerCancel={handleThrottleUp}
          onPointerLeave={handleThrottleUp}
          style={{
            ...pedalBaseStyle,
            width: `${Math.round(76 * sizeMultiplier)}px`,
            height: `${Math.round(112 * sizeMultiplier)}px`,
            background: throttlePressed
              ? 'linear-gradient(180deg, rgba(64, 111, 71, 0.8) 0%, rgba(0, 112, 209, 0.8) 100%)'
              : 'linear-gradient(180deg, rgba(255,252,241,.94) 0%, rgba(236,235,213,.92) 100%)',
            borderColor: throttlePressed ? '#426c43' : 'rgba(66, 108, 67, 0.65)',
            boxShadow: throttlePressed ? '0 2px 10px rgba(66, 108, 67, 0.25)' : 'none',
          }}
        >
          <span style={{ fontSize: '24px' }}>▲</span>
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#305132' }}>GAS</span>
          <span style={{ fontSize: '9px', opacity: 0.7 }}>THROTTLE</span>
        </button>
      </div>

      {/* Handbrake Button (Drift) - Right Thumb Placement (when not in tilt mode) */}
      {touchSteeringScheme !== 'tilt' && (
        <div
          style={{
            position: 'absolute',
            right: 'calc(24px + var(--sar, 0px))',
            bottom: `calc(${Math.round(150 * sizeMultiplier)}px + var(--sab, 0px))`,
            zIndex: 10,
            pointerEvents: 'auto',
          }}
        >
          <button
            type="button"
            data-testid="touch-btn-handbrake"
            aria-label="Handbrake Drift"
            onPointerDown={handleHandbrakeDown}
            onPointerUp={handleHandbrakeUp}
            onPointerCancel={handleHandbrakeUp}
            onPointerLeave={handleHandbrakeUp}
            style={{
              ...pedalBaseStyle,
              width: `${Math.round(84 * sizeMultiplier)}px`,
              height: `${Math.max(44, Math.round(48 * sizeMultiplier))}px`,
              borderRadius: '24px',
              background: handbrakePressed
                ? 'linear-gradient(180deg, rgba(244,210,143,.97) 0%, rgba(230,179,92,.98) 100%)'
                : 'linear-gradient(180deg, rgba(255,252,241,.94) 0%, rgba(236,235,213,.92) 100%)',
              borderColor: handbrakePressed ? '#a36a25' : 'rgba(163, 106, 37, 0.6)',
              boxShadow: handbrakePressed ? '0 2px 10px rgba(163, 106, 37, 0.25)' : 'none',
            }}
          >
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#61451d', letterSpacing: '0.5px' }}>
              DRIFT
            </span>
            <span style={{ fontSize: '8px', opacity: 0.7 }}>HANDBRAKE</span>
          </button>
        </div>
      )}

      {/* Manual Transmission Shift Buttons (Shift UP / DOWN) */}
      {transmissionMode === 'manual' && (
        <div
          data-testid="touch-manual-shifter"
          style={{
            position: 'absolute',
            right:
              touchSteeringScheme === 'tilt'
                ? 'calc(24px + var(--sar, 0px))'
                : `calc(${Math.round(120 * sizeMultiplier)}px + var(--sar, 0px))`,
            bottom: `calc(${Math.round(150 * sizeMultiplier)}px + var(--sab, 0px))`,
            display: 'flex',
            gap: '8px',
            pointerEvents: 'auto',
          }}
        >
          {/* Shift Down */}
          <button
            type="button"
            data-testid="touch-btn-shift-down"
            aria-label="Shift Down"
            onPointerDown={handleShiftDown}
            style={{
              ...utilityBtnStyle,
              width: `${Math.max(44, Math.round(48 * sizeMultiplier))}px`,
              height: `${Math.max(44, Math.round(48 * sizeMultiplier))}px`,
              background: 'rgba(255, 239, 204, 0.94)',
              borderColor: '#a36a25',
              color: '#61451d',
              fontWeight: 900,
              fontSize: '18px',
            }}
          >
            -
          </button>

          {/* Shift Up */}
          <button
            type="button"
            data-testid="touch-btn-shift-up"
            aria-label="Shift Up"
            onPointerDown={handleShiftUp}
            style={{
              ...utilityBtnStyle,
              width: `${Math.max(44, Math.round(48 * sizeMultiplier))}px`,
              height: `${Math.max(44, Math.round(48 * sizeMultiplier))}px`,
              background: 'rgba(226, 239, 209, 0.94)',
              borderColor: '#55764a',
              color: '#344e2e',
              fontWeight: 900,
              fontSize: '18px',
            }}
          >
            +
          </button>
        </div>
      )}
    </div>
  );
});

// --------------------------------------------------------------------------
// Shared Style Objects
// --------------------------------------------------------------------------
const utilityBtnStyle: React.CSSProperties = {
  background: 'rgba(255, 251, 237, 0.92)',
  border: '1px solid rgba(90, 108, 73, 0.55)',
  borderRadius: '12px',
  color: '#344b32',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  touchAction: 'none',
  padding: 0,
};

const steerBtnStyle: React.CSSProperties = {
  borderRadius: '16px',
  border: '2px solid rgba(90, 108, 73, 0.55)',
  color: '#344b32',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '2px',
  cursor: 'pointer',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  touchAction: 'none',
  padding: 0,
};

const pedalBaseStyle: React.CSSProperties = {
  borderRadius: '16px',
  border: '2px solid rgba(90, 108, 73, 0.55)',
  color: '#344b32',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '2px',
  cursor: 'pointer',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  touchAction: 'none',
  padding: 0,
};
