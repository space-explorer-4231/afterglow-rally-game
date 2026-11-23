import { useEffect, useState, useCallback, useRef } from 'react';
import { useGameStore } from '@/store/gameStore';
import { getActiveGamepad, sampleGamepad } from '@/utils/input/gamepad';

import { unlockSharedAudioContext, getSharedAudioContext } from '@/utils/audio/audioContext';


import { versionedAsset } from '@/utils/versionedAsset';

let _unlockAudioCtx: AudioContext | null = null;

/**
 * Minimalist Title Screen ("Press Any Key To Start").
 * Unlocks the WebAudio context silently on user gesture and transitions into the Main Menu.
 */
export function TitleScreen() {
  const gameState = useGameStore((s) => s.gameState);
  const setGameState = useGameStore((s) => s.setGameState);

  const [isFadingOut, setIsFadingOut] = useState(false);
  const startedRef = useRef(false);

  // Silently resume shared audio context to satisfy browser autoplay policy without allocating orphaned contexts
  const unlockAudioContext = useCallback(() => {
    try {
      if (typeof window === 'undefined') return;
      if (!_unlockAudioCtx) {
        _unlockAudioCtx = getSharedAudioContext();
        if (!_unlockAudioCtx) {
          const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          if (AudioCtx) {
            _unlockAudioCtx = new AudioCtx();
          }
        }
      }
      if (_unlockAudioCtx && _unlockAudioCtx.state === 'suspended') {
        _unlockAudioCtx.resume().catch(() => {});
      }
      unlockSharedAudioContext().catch(() => {});
    } catch {
      // Ignored
    }
  }, []);

  const handleStart = useCallback(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    setIsFadingOut(true);
    unlockAudioContext();
    window.dispatchEvent(new Event('aeroline-audio-ready'));

    setTimeout(() => {
      useGameStore.setState({ loadingTarget: 'menu', isSceneReady: false });
      setGameState('loading');
    }, 240);
  }, [unlockAudioContext, setGameState]);

  // Keyboard & mouse listener
  useEffect(() => {
    if (gameState !== 'title') return;

    const onKeyDown = () => handleStart();
    const onPointerDown = () => handleStart();

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('pointerdown', onPointerDown);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('pointerdown', onPointerDown);
    };
  }, [gameState, handleStart]);

  // Gamepad listener
  useEffect(() => {
    if (gameState !== 'title') return;

    let animFrameId: number;

    const checkGamepad = () => {
      const gp = getActiveGamepad();
      if (gp) {
        const state = sampleGamepad(1.0, gp);
        if (
          state.menuConfirm ||
          state.menuBack ||
          state.pauseToggle ||
          state.cameraToggle ||
          state.resetToggle ||
          state.menuUp ||
          state.menuDown ||
          state.menuLeft ||
          state.menuRight ||
          state.handbrake ||
          state.throttle > 0.3 ||
          state.brake > 0.3
        ) {
          handleStart();
          return;
        }
      }
      animFrameId = requestAnimationFrame(checkGamepad);
    };

    animFrameId = requestAnimationFrame(checkGamepad);

    return () => {
      cancelAnimationFrame(animFrameId);
    };
  }, [gameState, handleStart]);

  if (gameState !== 'title') {
    return null;
  }

  return (
    <div
      id="title-screen"
      className="aeroline-title"
      style={{
        ...styles.overlay,
        opacity: isFadingOut ? 0 : 1,
        pointerEvents: isFadingOut ? 'none' : 'auto',
      }}
      onClick={handleStart}
    >
      <div style={styles.content}>
        {/* Logo */}
        <div style={styles.logoWrapper}>
          <img
            src={versionedAsset('/aeroline-logo.svg')}
            alt="Aeroline"
            style={styles.logoImage}
          />
        </div>

        <h1 style={{fontSize:'clamp(30px,4vw,58px)',lineHeight:1.05,fontWeight:500,color:'#f5faf8',margin:0,letterSpacing:-1}}>Take the scenic route.</h1>
        <p style={{color:'#b5ccc7',fontSize:14,lineHeight:1.6,margin:0}}>A world to drive. A line to make your own.</p>
        <div style={styles.prompt}>
          <span style={styles.promptText}>Press any button to enter</span>
          <span style={styles.promptSub}>KEYBOARD · CONTROLLER · TOUCH</span>
        </div>


      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 90,
    backgroundImage: `
      linear-gradient(90deg, rgba(3, 17, 20, 0.94) 0%, rgba(3, 17, 20, 0.78) 34%, rgba(3, 17, 20, 0.12) 70%),
      linear-gradient(0deg, rgba(3, 17, 20, 0.60), transparent 45%)
    `,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    fontFamily: '"Outfit", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    userSelect: 'none',
    cursor: 'pointer',
    transition: 'opacity 0.3s ease-out',
    padding: 'calc(20px + var(--sat)) calc(20px + var(--sar)) calc(20px + var(--sab)) calc(5vw + var(--sal))',
    boxSizing: 'border-box',
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    textAlign: 'left',
    gap: '22px',
    maxWidth: 'min(560px, 100%)',
    padding: 'clamp(0px,2vw,24px)',
  },
  logoWrapper: {
    maxWidth: '470px',
    width: 'min(470px, 100%)',
  },
  logoImage: {
    width: '100%',
    height: 'auto',
    display: 'block',
    filter: 'drop-shadow(0 4px 22px rgba(0, 0, 0, 0.5))',
  },
  prompt: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '6px',
  },
  promptText: {
    color: '#5ef0d4',
    fontSize: '16px',
    fontWeight: 600,
    letterSpacing: '1px',
    textShadow: '0 2px 12px rgba(0, 0, 0, 0.8), 0 0 20px rgba(255, 255, 255, 0.3)',
  },
  promptSub: {
    color: '#94A3B8',
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '2px',
    textTransform: 'uppercase',
  },
  authorBadge: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 16px',
    borderRadius: '20px',
    background: 'rgba(15, 23, 42, 0.7)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    backdropFilter: 'blur(8px)',
  },
  authorLabel: {
    color: 'rgba(243, 244, 246, 0.5)',
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '1px',
    textTransform: 'uppercase',
  },
  authorName: {
    color: '#F3F4F6',
    fontSize: '12px',
    fontWeight: 700,
    letterSpacing: '0.5px',
  },
  versionTag: {
    color: '#dca36a',
    fontSize: '11px',
    fontWeight: 800,
  },
};
