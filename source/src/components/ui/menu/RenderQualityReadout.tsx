import { useEffect, useState } from 'react';

/** Actual drawing-buffer size, not an advertised screen resolution or FPS target. */
export function RenderQualityReadout() {
  const [measurement, setMeasurement] = useState('');
  useEffect(() => {
    const update = () => {
      const canvas = document.querySelector<HTMLCanvasElement>('canvas[data-game-renderer="true"]');
      if (!canvas) return;
      const fps = canvas.dataset.lastDriveFps;
      setMeasurement(`${canvas.width} × ${canvas.height} rendered pixels${fps ? ` · last drive ${fps} FPS` : ''}`);
    };
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, []);
  return <p style={{ margin: '6px 0 14px', color: '#355448', fontSize: 12, lineHeight: 1.5 }}>
    {measurement && <strong style={{ display: 'block' }}>{measurement}</strong>}
    Native resolution keeps the picture crisp. Enable Dynamic Resolution only if you prefer extra speed over sharpness.
    {' '}1080p needs a 1920 × 1080 game area; frame rate depends on your device.
  </p>;
}
