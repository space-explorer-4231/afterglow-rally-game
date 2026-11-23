import {useEffect,useRef} from 'react';
import {useGameStore} from '@/store/gameStore';
import {NITRO_RECHARGE_SECONDS,NITRO_TOTAL_SECONDS} from '@/utils/physics/nitro';
export function NitroStatus(){
  const first=useRef<HTMLProgressElement>(null),second=useRef<HTMLProgressElement>(null),label=useRef<HTMLSpanElement>(null);
  const meter=useRef<HTMLDivElement>(null),charge=useRef<SVGCircleElement>(null),percent=useRef<HTMLElement>(null);
  const controller=useGameStore(s=>s.gamepadConnected);
  useEffect(()=>{
    const update=()=>{const s=useGameStore.getState(),remaining=s.nitroRemaining;
      const ratio=Math.max(0,Math.min(1,remaining/NITRO_TOTAL_SECONDS));
      if(meter.current)meter.current.dataset.boost=s.nitroActive?'active':ratio<.001?'empty':ratio>.999?'ready':'charging';
      if(charge.current)charge.current.style.strokeDashoffset=String(188.5*(1-ratio));
      if(percent.current)percent.current.textContent=String(Math.round(ratio*100));
      if(first.current)first.current.value=Math.max(0,remaining-5);
      if(second.current)second.current.value=Math.min(5,remaining);
      if(label.current)label.current.textContent=remaining<=.001?'NOS EMPTY · release to recharge'
        :s.nitroActive&&s.gameState==='playing'?'NOS ACTIVE · '+remaining.toFixed(1)+'s'
        :remaining>=9.999?'NOS READY · 2 tanks':'NOS · '+remaining.toFixed(1)+'s · release: '+Math.ceil((NITRO_TOTAL_SECONDS-remaining)*NITRO_RECHARGE_SECONDS/NITRO_TOTAL_SECONDS)+'s to full';
    };update();const timer=window.setInterval(update,100);return()=>window.clearInterval(timer);
  },[]);
  return <div ref={meter} className="nitro-status" data-boost="ready"><div className="nitro-orbit" aria-hidden="true"><svg viewBox="0 0 76 76"><circle cx="38" cy="38" r="30" className="nitro-orbit-track"/><circle ref={charge} cx="38" cy="38" r="30" className="nitro-orbit-charge" strokeDasharray="188.5" strokeDashoffset="0"/></svg><strong ref={percent}>100</strong><span>BOOST</span></div><div className="nitro-readout"><div><span ref={label}>NOS · 10.0s / 2 tanks</span><small>{controller?'HOLD L3':'HOLD SHIFT'}</small></div>
    <div className="nitro-tanks"><progress ref={first} aria-label="NOS tank 1" max={5} value={5}/><progress ref={second} aria-label="NOS tank 2" max={5} value={5}/></div>
    </div></div>;
}
