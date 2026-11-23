import {useEffect,useState} from 'react';
import {useGameStore} from '@/store/gameStore';
import {getLastInputType,type InputType} from '@/utils/input/touch';
import {NitroStatus} from './NitroStatus';
import './driveDashboard.css';

/** A quiet energy meter with a deliberately requested, compact control guide. */
export function DriveDashboard(){
  const [help,setHelp]=useState(false);
  const [input,setInput]=useState<InputType>(getLastInputType);
  useEffect(()=>{
    const key=(event:KeyboardEvent)=>{if(event.code==='KeyH'&&!event.repeat)setHelp(value=>!value);};
    const guide=()=>setHelp(value=>!value);
    const update=()=>setInput(getLastInputType());
    window.addEventListener('keydown',key);window.addEventListener('speedrunner-drive-guide',guide);window.addEventListener('openrally-input-switch',update);
    return()=>{window.removeEventListener('keydown',key);window.removeEventListener('speedrunner-drive-guide',guide);window.removeEventListener('openrally-input-switch',update);};
  },[]);
  const controller=useGameStore(s=>s.gamepadConnected);
  const pad=input==='gamepad'||controller;
  return <>
    <section className="drive-console" aria-label="Boost fuel"><NitroStatus/></section>
    {help&&<section className="first-drive-guide simple-drive-guide" aria-label="Driving controls">
      <h2>Find your flow.</h2>
      <p>{input==='touch'?'Use the pedals to drive and the steering pad to turn.':pad?'Triggers to drive · left stick to steer':'WASD or arrow keys to drive'}</p>
      <p>{input==='touch'?'Hold NOS to boost · tap handbrake to slide':pad?'Hold L3 to boost · X / Square to slide':'Hold Shift to boost · tap Space to slide'}</p>
      <p>{input==='touch'?'Camera changes your view · recovery returns you to the road':pad?'LB camera · Y recovery · Menu pause':'C camera · double R recovery · Esc pause'}</p>
      <button className="drive-guide-close" onClick={()=>setHelp(false)}>Back to the road</button>
      <small>{pad?'D-pad up closes this guide':'H closes this guide'} · More options in Pause</small>
    </section>}
  </>;
}
