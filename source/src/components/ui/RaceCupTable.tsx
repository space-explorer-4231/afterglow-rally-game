import type {RaceCupState} from '@/types/network';
import {useState} from 'react';

/** A single shared table replaces the lap board once points have been awarded. */
export function RaceCupTable({cup,self}:{cup:RaceCupState;self:string|null}) {
  const [page,setPage]=useState(0);
  const pages=Math.ceil(cup.standings.length/6),current=Math.min(page,pages-1);
  const mine=cup.standings.findIndex(driver=>driver.id===self);
  return <div className="race-cup">
    <div className="race-cup-title"><strong>{cup.completed===3?'FINAL CUP STANDINGS':'CUP STANDINGS'}</strong><span>POINTS</span></div>
    {mine>=0&&<div className="race-cup-personal">Your Cup: #{mine+1} · {cup.standings[mine].points} points · +{cup.standings[mine].lastPoints} this race</div>}
    <ol className="race-grid-drivers race-cup-table">{cup.standings.slice(current*6,current*6+6).map((driver,index)=><li key={driver.id} className={driver.id===self?'race-cup-you':''}>
      <span><b className="race-cup-place">{current*6+index+1}</b>{driver.nickname}{driver.id===self?' · YOU':''}</span>
      <strong>{driver.lastPoints>0&&<small>+{driver.lastPoints}</small>}{driver.points}</strong>
    </li>)}</ol>
    {pages>1&&<div className="race-cup-pages"><button data-race-control disabled={current===0} onClick={()=>setPage(current-1)}>Previous</button><span>{current+1} / {pages}</span><button data-race-control disabled={current===pages-1} onClick={()=>setPage(current+1)}>Next standings</button></div>}
    <p className="race-grid-small">Finish for points: 12 · 10 · 8 · 7 · 6… DNF earns 0. Ties: wins, finishes, then total race time. Late arrivals can score the remaining races.</p>
  </div>;
}
