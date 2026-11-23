import { useEffect, useRef } from 'react';
import { useGameStore } from '@/store/gameStore';
import { useSettingsStore } from '@/store/settingsStore';
import { driftSpeedRange } from '@/utils/displayUnits';

/** Compact live drift feedback beside the instruments, with no clock or failure state. */
export function DriftCoach() {
  const speedUnit = useSettingsStore(s => s.speedUnit);
  const label = useRef<HTMLDivElement>(null);
  const meter = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const update = () => {
      const state = useGameStore.getState();
      const degrees = Math.abs(state.slipAngle) * 180 / Math.PI;
      if (label.current) label.current.textContent = state.isAirborne ? 'Land gently · steer after landing'
        : state.burnout ? 'BURNOUT · release Space to launch'
        : state.speed < 25 ? `Build speed · aim for ${driftSpeedRange(speedUnit)}`
        : degrees < 10 ? 'Turn + tap Space · balance throttle'
        : degrees < 45 ? `DRIFT ${Math.round(degrees)}° · release Space to grip`
        : 'Ease off · release steering to recover';
      if (meter.current) meter.current.style.transform = `scaleX(${Math.min(1, degrees / 60)})`;
    };
    update();
    const timer = window.setInterval(update, 150);
    return () => window.clearInterval(timer);
  }, [speedUnit]);
  return <aside className="drift-coach" aria-label="Drift coach">
    <div style={{ fontSize: 10, letterSpacing: 2, color: '#78e7ce', marginBottom: 6 }}>DRIFT PRACTICE</div>
    <div ref={label} style={{ fontSize: 12 }}>Build speed · aim for {driftSpeedRange(speedUnit)}</div>
    <div style={{ height: 3, background: '#26394a', marginTop: 9, overflow: 'hidden' }}>
      <div ref={meter} style={{ height: '100%', background: '#78e7ce', transformOrigin: 'left', transform: 'scaleX(0)', transition: 'transform 150ms linear' }} />
    </div>
    <div id="render-fps" style={{ marginTop: 7, fontSize: 10, color: '#9caebd' }}>Measuring FPS…</div>
  </aside>;
}
