import { RestartConfirmation } from './RestartConfirmation';
import { DriftClub } from './DriftClub';

import { useGameStore } from '@/store/gameStore';

import { TelemetryHUD } from './TelemetryHUD';
import { Minimap } from './Minimap';
import { AnalogGauges, TimingBoard, GymkhanaBoard, TagBoard } from './gauges';
import { GymkhanaCompleteModal } from './GymkhanaCompleteModal';
import { TagCompleteModal } from './TagCompleteModal';
import { MultiplayerRaceLobby } from './MultiplayerRaceLobby';
import {MultiplayerRaceResults} from './MultiplayerRaceResults';
import { MultiplayerHUD } from './MultiplayerHUD';
import { RolloverAlert } from './RolloverAlert';
import { SpeedEffects } from './SpeedEffects';
import { RoadRun } from './RoadRun';
import { DriftCoach } from './DriftCoach';
import { DriveDashboard } from './DriveDashboard';
import {DrivingTips} from './DrivingTips';


import {useMultiplayerStore} from '@/store/multiplayerStore';
import {isSharedRacePanelOpen} from '@/utils/hudVisibility';
import './hudLayout.css';
import {useClubStore} from '@/store/clubStore';
import {useFestivalMusicStore} from '@/store/festivalMusicStore';
import {FESTIVAL_PLAYLIST} from '@/config/festivalPlaylist';
import {isMobileDevice} from '@/utils/device';
import {useEffect,useState} from 'react';
import {useSettingsStore} from '@/store/settingsStore';
import {getLastInputType,isTouchDevice} from '@/utils/input/touch';

/**
 * Rally HUD overlay — authentic twin-gauge rally cluster (analog Speedometer & Tachometer),
 * rally stage roadbook minimap, telemetry data, and rally timing board.
 * Subcomponents use high-performance transient DOM updates for 0 React re-renders during gameplay.
 */
export function HUD() {
  const touchMode=useSettingsStore(s=>s.touchControlMode);
  const [input,setInput]=useState(getLastInputType);
  useEffect(()=>{
    const update=()=>setInput(getLastInputType());
    window.addEventListener('openrally-input-switch',update);
    window.addEventListener('keydown',update);
    window.addEventListener('pointerdown',update);
    return()=>{window.removeEventListener('openrally-input-switch',update);window.removeEventListener('keydown',update);window.removeEventListener('pointerdown',update);};
  },[]);
  const touchHud=isMobileDevice()||touchMode==='always'||(touchMode==='auto'&&(input==='touch'||isTouchDevice())&&input!=='keyboard'&&input!=='gamepad');
  const nightFrequency=useClubStore(s=>s.nightFrequency);
  const songIndex=useFestivalMusicStore(s=>s.index),musicStatus=useFestivalMusicStore(s=>s.status);
  const song=FESTIVAL_PLAYLIST[songIndex];
  const recoveryCountdown=useGameStore(s=>s.recoveryCountdown);
  const gameState = useGameStore((s) => s.gameState);
  const gameMode = useGameStore((s) => s.gameMode);
  const isSceneReady = useGameStore((s) => s.isSceneReady);
  useEffect(()=>{if(isSceneReady)useGameStore.getState().setTelemetryEnabled(false);},[isSceneReady]);

  const room=useMultiplayerStore(s=>s.currentRoom),raceStart=useMultiplayerStore(s=>s.raceStart),raceRound=useMultiplayerStore(s=>s.raceRound),self=useMultiplayerStore(s=>s.selfId);
  const racePanel=isSharedRacePanelOpen(room?.gameMode,raceStart,raceRound,self);

  return (
    <div id="hud" className={'hud-mode-'+gameMode+(room?' hud-online':'')+(touchHud?' hud-touch':'')} data-race-panel={racePanel} style={styles.container}>
      <DriftClub />
      {gameState === 'playing' && isSceneReady && <>
      {/* Dynamic High-Speed Peripheral Vignette & Radial Wind Streaks */}
      <RestartConfirmation />
      {recoveryCountdown>0&&<div role="status" aria-live="polite" className="recovery-countdown"><small>CHECKPOINT RECOVERY</small><strong>{recoveryCountdown}</strong><span>Ready to drive in {recoveryCountdown}s</span></div>}
      {!racePanel&&<>
      <SpeedEffects />
      <RoadRun />
      {gameMode==='gymkhana_blitz'&&<DriftCoach />}
      <DriveDashboard />
      <DrivingTips touch={touchHud}/>
      </>}

      {/* Background Music */}
      <div className="district-radio" style={{position:'absolute',bottom:14,left:18,fontSize:11,color:'#c9d8e4',opacity:0.85,pointerEvents:'none',letterSpacing:0.4}}>
        {nightFrequency?'✦ ':''}FESTIVAL RADIO · {song.title} / {song.artists}{musicStatus==='blocked'?' · TAP TO ENABLE MUSIC':''}
      </div>

      {/* Physics Telemetry Gauge (Friction, Wheel Angular Velocity, G-Forces) */}
      {!racePanel&&<TelemetryHUD />}

      {/* Rally Stage Minimap */}
      {!racePanel&&<Minimap />}

      {/* Stage Timing Card & 3-2-1-GO Countdown (Time Attack mode) */}
      {!racePanel&&<TimingBoard />}

      {/* Gymkhana Blitz Timer, Drift Score Card & Countdown */}
      <GymkhanaBoard />

      {/* Rally Tag Board, Countdown & Role Status */}
      <TagBoard />

      {/* Authentic Rally Twin-Gauge Cluster (Speedometer & Tachometer) */}
      {!racePanel&&<AnalogGauges />}

      {/* Gymkhana Blitz Stage Complete Results Modal */}
      <GymkhanaCompleteModal />

      {/* Rally Tag Stage Complete Results Modal */}
      <TagCompleteModal />

      {/* Online Multiplayer Gymkhana Arena Status & Roster */}
      <MultiplayerHUD />
      <MultiplayerRaceLobby />
      <MultiplayerRaceResults />

      {/* Vehicle Rollover / Inverted Roof Alert and Recovery Prompt */}
      <RolloverAlert />
      </>}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    fontFamily: "'Segoe UI', Roboto, sans-serif",
    zIndex: 60,
  },
};
