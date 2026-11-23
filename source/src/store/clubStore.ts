import {create} from 'zustand';
export function foundNightFrequency(speed:number,boost:boolean):boolean {
  return boost&&Number.isFinite(speed)&&speed>=88;
}
/** A local-only Easter egg; it never changes race standings or vehicle performance. */
export const useClubStore=create<{nightFrequency:boolean;discover:(speed:number,boost:boolean)=>void}>((set,get)=>({
  nightFrequency:false,
  discover:(speed,boost)=>{if(!get().nightFrequency&&foundNightFrequency(speed,boost))set({nightFrequency:true});},
}));
