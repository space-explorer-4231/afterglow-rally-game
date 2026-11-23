import {create} from 'zustand';
export const HUNT_SECONDS=90;
interface HuntState {active:boolean;finished:boolean;remaining:number;score:number;combo:number;collected:number;target:number;lastPickup:number;message:string;start:(target:number)=>void;stop:()=>void;tick:(dt:number)=>void;collect:()=>number}
export const useBoostHuntStore=create<HuntState>((set,get)=>({active:false,finished:false,remaining:HUNT_SECONDS,score:0,combo:1,collected:0,target:0,lastPickup:HUNT_SECONDS,message:'Follow the amber rings. Each pickup restores NOS.',
 start:target=>set({active:true,finished:false,remaining:HUNT_SECONDS,score:0,combo:1,collected:0,target,lastPickup:HUNT_SECONDS,message:'GO! Chase the glowing rings'}),
 stop:()=>set({active:false,finished:false}),
 tick:dt=>{const s=get();if(!s.active||!Number.isFinite(dt)||dt<=0)return;const remaining=Math.max(0,s.remaining-Math.min(dt,.2));set({remaining,...(remaining===0?{active:false,finished:true,message:'RUN COMPLETE · beat your score!'}:{})});},
 collect:()=>{const s=get();if(!s.active||s.lastPickup-s.remaining<.35)return 0;const combo=s.collected>0&&s.lastPickup-s.remaining<=8?Math.min(5,s.combo+1):1,collected=s.collected+1;set({target:s.target+1,collected,combo,score:s.score+100*combo,lastPickup:s.remaining,message:collected%5===0?'FULL NOS · keep the streak!':`+${100*combo} · NOS RECHARGED`});return collected%5===0?1:.35;}
}));
