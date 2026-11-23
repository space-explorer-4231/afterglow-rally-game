import {chooseDriveActivity} from '@/store/driveActivityStore';
import {useBoostHuntStore} from '@/store/boostHuntStore';
import {useGameStore} from '@/store/gameStore';
/** Fits the existing road card rather than adding another floating HUD panel. */
export function BoostHuntPanel(){
 const hunt=useBoostHuntStore(),speed=useGameStore(s=>s.speed);
 return <section className="boost-hunt" aria-label="Boost Hunt challenge">
  <div><strong>BOOST HUNT</strong><span>{hunt.active?`${Math.ceil(hunt.remaining)}s · ×${hunt.combo}`:'90 SECONDS · CHASE THE RINGS'}</span></div>
  {hunt.active||hunt.finished?<><b className="hunt-score">{hunt.score.toLocaleString()} PTS · {hunt.collected} RINGS</b><small role="status">{hunt.message}</small></>:<small>Drive through glowing rings. Build combos. Refill NOS.</small>}
  <button type="button" disabled={!hunt.active&&speed>10} onClick={()=>hunt.active?chooseDriveActivity('cruise'):chooseDriveActivity('hunt')}>{hunt.active?'End Boost Hunt':hunt.finished?'Race again':'Start Boost Hunt'}</button>
  {!hunt.active&&speed>10&&<small>Slow down to start a fresh hunt.</small>}
 </section>;
}

