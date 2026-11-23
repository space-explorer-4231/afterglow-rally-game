import {useLapGhostStore} from '@/store/lapGhostStore';
import './ghostPace.css';
/** Passive checkpoint comparison works with keyboard, touch and controller driving. */
export function GhostPace(){
  const record=useLapGhostStore(s=>s.record),message=useLapGhostStore(s=>s.message),delta=useLapGhostStore(s=>s.splitDelta),checkpoint=useLapGhostStore(s=>s.checkpoint);
  // A replay that does not exist has no useful pace information during driving.
  if (!record) return null;
  return <section className="ghost-pace" aria-label="Personal best ghost">
    <div><span>PERSONAL BEST GHOST</span><strong>{record?record.duration.toFixed(2)+'s':'—'}</strong></div>
    {delta!==null&&<p className={delta<=0?'ghost-pace__ahead':'ghost-pace__behind'}>CP {checkpoint} · {delta<=0?'−':'+'}{Math.abs(delta).toFixed(2)}s {delta<=0?'ahead':'behind'}</p>}
    <small>{message}</small><small className="ghost-pace__rules">Same car, tires and assists · personal replay · no collisions</small>
  </section>;
}
