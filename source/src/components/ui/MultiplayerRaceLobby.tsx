import { useMultiplayerStore } from '@/store/multiplayerStore';
import { networkClient } from '@/network/networkClient';
import './MultiplayerRaceLobby.css';
import {useRef,useState} from 'react';
import {useRacePanelNavigation} from '@/hooks/useRacePanelNavigation';
import {applyEasyDriving,applySmoothGraphics} from '@/utils/drivePresets';

/** Accessible, responsive grid controls; authority and ballot thresholds live on the server. */
export function MultiplayerRaceLobby() {
  const room = useMultiplayerStore(s => s.currentRoom);
  const state = useMultiplayerStore(s => s.raceStart);
  const selfId = useMultiplayerStore(s => s.selfId);
  const players = useMultiplayerStore(s => s.remotePlayers);
  const isHost = useMultiplayerStore(s => s.isHost);
  const panel=useRef<HTMLElement>(null);
  const [inviteStatus,setInviteStatus]=useState('Invite friends');
  useRacePanelNavigation(panel,room?.gameMode==='timeattack'&&state?.phase==='waiting');
  if (room?.gameMode !== 'timeattack' || !state || !selfId) return null;
  const voted = state.votedIds.includes(selfId);
  const selfReady = state.readyIds.includes(selfId);
  const allReady = state.memberIds.length > 0 && state.readyIds.length === state.memberIds.length;
  const voteOpen = state.memberIds.length >= 3;
  const spectating = state.phase !== 'waiting' && !state.racerIds.includes(selfId);
  if (state.phase !== 'waiting') {
    if(state.phase==='results')return null;
    return spectating ? <aside className="race-spectator" role="status">Race underway · You join next race</aside> : null;
  }
  return <section ref={panel} className="race-grid race-grid-compact" aria-label="Multiplayer starting grid">
    <header className="race-ready-header"><div><h2>Ready to race?</h2><span className="race-grid-small">3 races · 1 lap each</span></div><span className="race-ready-code" aria-label={`Room code ${room.id}`}>{room.id}</span></header>
    <div className="race-ready-invite"><span>{room.name}</span><button data-race-control onClick={async()=>{
      try{await navigator.clipboard.writeText(`${window.location.origin}/?room=${encodeURIComponent(room.id)}`);setInviteStatus('Copied!');}
      catch{setInviteStatus('Copy link below');}
    }}>{inviteStatus}</button><span role="status" className="race-ready-copy-status">{inviteStatus==='Copied!'?'Invite copied':''}</span></div>
    <ul className="race-grid-drivers">{state.memberIds.map(id => <li key={id}>
      <span>{players[id]?.nickname ?? 'Connecting driver'}{id === selfId ? ' (You)' : ''}{id === room.hostId ? ' · Host' : ''}</span>
      <span className={state.readyIds.includes(id) ? 'driver-ready' : 'driver-loading'}>
        {state.readyIds.includes(id) ? (state.votedIds.includes(id) ? 'VOTED ✓' : 'READY') : 'LOADING…'}
      </span>
    </li>)}</ul>
    <div className="race-grid-actions">
      {isHost && <button data-race-control className="race-start" disabled={!allReady} onClick={() => networkClient.startRoomRace()}>Start race</button>}
      {voteOpen && <button data-race-control className="race-vote" disabled={!selfReady} aria-pressed={voted}
        onClick={() => networkClient.voteRoomRace(!voted)}>{voted ? 'Withdraw Vote' : 'Vote to Start'} · {state.votedIds.length}/{state.requiredVotes}</button>}
    </div>
    <div className="race-grid-hint" role="status">{!allReady ? `Loading · ${state.readyIds.length}/${state.memberIds.length} ready` :
      !isHost ? 'Waiting for host' : 'Everyone ready'}</div>
    <details className="club-race-help"><summary data-race-control>Help &amp; settings</summary>
      <p>Follow the gates. Most points wins after 3 races.</p>
      <p>WASD / arrows: drive · Shift: boost · Space: handbrake · Double R: recover (may end your run).</p>
      <p>Controller: triggers + stick · L3: boost · Y twice: recover. Touch: on-screen controls.</p>
      <p>Next races start automatically. Finish within 30 seconds of the leader. With 3+ drivers, a majority can start.</p>
      <div className="race-grid-actions"><button data-race-control onClick={applyEasyDriving}>All assists on</button><button data-race-control onClick={applySmoothGraphics}>Balanced graphics</button></div>
      <a data-race-control className="race-grid-invite" href={`/?room=${encodeURIComponent(room.id)}`} target="_blank" rel="noreferrer">Invite link ↗</a>
    </details>
  </section>;
}
