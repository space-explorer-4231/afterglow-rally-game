import './loadingScreen.css';
import { useEffect, useState, type CSSProperties } from 'react';
import { useAssetProgress } from '@/hooks/useAssetProgress';
import { useGameStore } from '@/store/gameStore';
import { useRacingStore } from '@/store/racingStore';
import { useGymkhanaStore } from '@/store/gymkhanaStore';
import { getLevelPreset } from '@/config/levelRegistry';
import { getVehiclePreset } from '@/config/vehicleRegistry';
import { loadingArtwork,shuffleLoadingGallery,LOADING_SLIDE_MS } from '@/config/loadingGallery';



/**
 * Loading screen overlay — shown while physics/scene initializes when entering gameplay.
 * Fades out once ready. Styled consistently with the cinematic dark rally atmosphere.
 */
export function LoadingScreen() {
  const { progress } = useAssetProgress();
  const storeGameState = useGameStore((s) => s.gameState);
  const storeRenderReady=useGameStore(s=>s.isRenderReady);
  const renderReady=useGameStore.getState().isRenderReady??storeRenderReady;
  const storeIsSceneReady = useGameStore((s) => s.isSceneReady);
  const storeIsVehicleVisualReady = useGameStore((s) => s.isVehicleVisualReady);
  const storeLoadingTarget = useGameStore((s) => s.loadingTarget);
  const storeSelectedLevelId = useGameStore((s) => s.selectedLevelId);
  const storeSelectedVehicleId = useGameStore((s) => s.selectedVehicleId);

  const gameState = useGameStore.getState().gameState ?? storeGameState;
  const isSceneReady = useGameStore.getState().isSceneReady ?? storeIsSceneReady;
  const isVehicleVisualReady = useGameStore.getState().isVehicleVisualReady ?? storeIsVehicleVisualReady;
  const loadingTarget = useGameStore.getState().loadingTarget ?? storeLoadingTarget;
  const selectedLevelId = useGameStore.getState().selectedLevelId ?? storeSelectedLevelId;
  const selectedVehicleId = useGameStore.getState().selectedVehicleId ?? storeSelectedVehicleId;

  const level = getLevelPreset(selectedLevelId);
  const vehicle = getVehiclePreset(selectedVehicleId);

  const [visible,setVisible]=useState(false),[fadeOut,setFadeOut]=useState(false),[artIndex,setArtIndex]=useState(0),[delayed,setDelayed]=useState(false);
  const isMenuLoading=gameState==='loading'&&loadingTarget==='menu';
  const fullyReady=isSceneReady&&isVehicleVisualReady&&renderReady;
  const slideshowOpen=gameState==='loading'||(gameState==='playing'&&!fullyReady)||(visible&&!fadeOut);
  useEffect(()=>{
    if(!slideshowOpen)return;
    let previous=-1;try{const saved=sessionStorage.getItem('aeroline_loading_gallery_v2');if(saved!==null)previous=Number(saved);}catch{/* Slideshow is available without storage. */}
    let deck=shuffleLoadingGallery(previous),cursor=0;
    const show=()=>{const index=deck[cursor];setArtIndex(index);try{sessionStorage.setItem('aeroline_loading_gallery_v2',String(index));}catch{/* Optional history. */}};
    show();const timer=window.setInterval(()=>{cursor++;if(cursor===deck.length){deck=shuffleLoadingGallery(deck[deck.length-1]);cursor=0;}show();},LOADING_SLIDE_MS);
    return()=>window.clearInterval(timer);
  },[slideshowOpen]);
  useEffect(()=>{
    if(gameState!=='loading'&&gameState!=='playing')return;
    if(!fullyReady){
      const frame=window.requestAnimationFrame(()=>{setVisible(true);setFadeOut(false);setDelayed(false);});
      const timer=window.setTimeout(()=>setDelayed(true),12000);
      return()=>{window.cancelAnimationFrame(frame);window.clearTimeout(timer);};
    }
    if(gameState==='playing'&&!visible)return;
    let holdTimer:number|undefined,fadeTimer:number|undefined;
    const frame=window.requestAnimationFrame(()=>{
      setVisible(true);holdTimer=window.setTimeout(()=>{setFadeOut(true);fadeTimer=window.setTimeout(()=>{
        setVisible(false);if(useGameStore.getState().gameState!=='loading')return;
        const target=useGameStore.getState().loadingTarget;useGameStore.getState().setGameState(target==='gameplay'?'playing':'menu');
        if(target==='gameplay'){if(useGameStore.getState().gameMode==='timeattack')useRacingStore.getState().startCountdown();else if(useGameStore.getState().gameMode==='gymkhana_blitz')useGymkhanaStore.getState().startCountdown();}
      },600);},isMenuLoading?500:0);
    });
    return()=>{window.cancelAnimationFrame(frame);if(holdTimer)window.clearTimeout(holdTimer);if(fadeTimer)window.clearTimeout(fadeTimer);};
  },[gameState,fullyReady,isMenuLoading,visible]);

  // Remove the finished overlay entirely, including on pause/resume.
  if(gameState!=='loading'&&gameState!=='playing')return null;
  if(gameState==='playing'&&fullyReady&&!visible)return null;

  // Format progress for display
  const displayProgress = Math.round(progress) || (isSceneReady && (isMenuLoading || isVehicleVisualReady) ? 100 : 0);
  const loadingStyle:CSSProperties&{'--club-loading-art':string}={
    ...styles.overlay,
    '--club-loading-art':`url('/images/aeroline/${loadingArtwork(artIndex).file}')`,
    opacity:!fullyReady?1:fadeOut?0:1,transition:'opacity 0.6s ease-out',pointerEvents:fadeOut?'none':'all',
  };

  return (
    <div
      id="loading-screen" data-scene-ready={isSceneReady} data-model-ready={isVehicleVisualReady} data-render-ready={renderReady}
      className="aeroline-loading"
      style={loadingStyle}
    >
      <div style={styles.content}>

        {/* Game Logo */}
        <div style={styles.logoContainer}>
          <img
            src="/aeroline-logo.svg"
            alt="Aeroline"
            style={styles.logoImage}
          />
        </div>

        {/* Stage & Machine Preview Pill (Only shown when entering gameplay/stage) */}
        {!isMenuLoading && (
          <div className="loading-stage-pill" style={styles.stagePill}>
            <span style={styles.stageLabel}>STAGE:</span>
            <span style={styles.stageValue}>{level.name}</span>
            <span style={styles.separator}>•</span>
            <span style={styles.stageLabel}>MACHINE:</span>
            <span style={styles.stageValue}>{vehicle.name}</span>
          </div>
        )}

        <p className="club-loading-tip">{selectedLevelId==='level3_sweden'?'Fresh snow. Gentle steering. Big adventures.':selectedLevelId==='level6_gymkhana_harbor'?'Meet by the harbor. Leave with a story.':'Good roads are better with friends.'}</p>
        {/* Loading bar */}
        <div className="loading-progress-rail" style={styles.loadingBar}>
          <div
            style={{
              ...styles.loadingFill,
              width: `${Math.max(8, displayProgress)}%`,
            }}
          >
            <div style={styles.loadingGlow} />
          </div>
        </div>

        {/* Status Text */}
        <p style={styles.subtitle}>
          {delayed?'STILL PREPARING YOUR DRIVE · PLEASE WAIT':!renderReady&&isSceneReady&&isVehicleVisualReady?'WARMING UP GRAPHICS':isMenuLoading
            ? displayProgress < 100
              ? `PREPARING AEROLINE • ${displayProgress}%`
              : 'YOUR OPEN ROAD IS READY'
            : displayProgress < 100
              ? `FINDING YOUR STARTING LINE • ${displayProgress}%`
              : 'ENGINE READY • ENTERING STAGE'}
        </p>


      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 100,
    backgroundImage: `
      linear-gradient(180deg, rgba(6, 9, 16, 0.85) 0%, rgba(9, 13, 24, 0.94) 100%),
      radial-gradient(circle at center, rgba(227, 24, 55, 0.15) 0%, transparent 60%),
      url('/images/aeroline/coastal-drive.webp')
    `,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: '"Outfit", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    pointerEvents: 'none',
    padding: 'calc(20px + var(--sat)) calc(20px + var(--sar)) calc(20px + var(--sab)) calc(20px + var(--sal))',
    boxSizing: 'border-box',
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    gap: '24px',
    maxWidth: '560px',
    padding: '24px',
  },
  logoContainer: {
    maxWidth: '480px',
    width: '85vw',
  },
  logoImage: {
    width: '100%',
    height: 'auto',
    display: 'block',
    filter: 'drop-shadow(0 12px 32px rgba(227, 24, 55, 0.35)) drop-shadow(0 2px 8px rgba(0, 0, 0, 0.8))',
  },
  stagePill: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 16px',
    borderRadius: '20px',
    background: 'rgba(15, 23, 42, 0.75)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    backdropFilter: 'blur(8px)',
    fontSize: '12px',
    letterSpacing: '0.5px',
  },
  stageLabel: {
    color: '#94A3B8',
    fontWeight: 700,
    fontSize: '11px',
    letterSpacing: '1px',
  },
  stageValue: {
    color: '#FFFFFF',
    fontWeight: 800,
  },
  separator: {
    color: '#64748B',
  },
  loadingBar: {
    width: '320px',
    height: '6px',
    background: 'rgba(255, 255, 255, 0.08)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  loadingFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #1556df, #62b9ff, #dcefff)',
    backgroundSize: '200% 100%',
    borderRadius: '3px',
    position: 'relative' as const,
    transition: 'width 0.2s ease-out',
  },
  loadingGlow: {
    position: 'absolute' as const,
    inset: '-2px',
    background: 'inherit',
    filter: 'blur(4px)',
    opacity: 0.4,
  },
  subtitle: {
    fontSize: '12px',
    color: '#CBD5E1',
    letterSpacing: '3px',
    margin: 0,
    fontWeight: 800,
    textTransform: 'uppercase',
  },
  authorBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '4px 14px',
    borderRadius: '16px',
    background: 'rgba(15, 23, 42, 0.5)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    marginTop: '8px',
  },
  authorLabel: {
    color: 'rgba(243, 244, 246, 0.5)',
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '1px',
    textTransform: 'uppercase',
  },
  authorName: {
    color: '#F3F4F6',
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.5px',
  },
  versionTag: {
    color: '#E31837',
    fontSize: '11px',
    fontWeight: 800,
  },
};




