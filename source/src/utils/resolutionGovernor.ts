/** Wall-clock rendering samples with hysteresis to prevent framebuffer resize flicker. */
export interface ResolutionGovernorState {
  scale:number;slowSeconds:number;fastSeconds:number;
  sampleSeconds?:number;sampleFrames?:number;
}
/** Classify half-second mean frame times; isolated good frames cannot conceal sustained overload. */
export function updateResolutionGovernor(state:ResolutionGovernorState,frameSeconds:number,targetFps:number):number {
  if(!Number.isFinite(frameSeconds)||frameSeconds<=0||frameSeconds>0.2){
    state.slowSeconds=0;state.fastSeconds=0;state.sampleSeconds=0;state.sampleFrames=0;return state.scale;
  }
  state.sampleSeconds=(state.sampleSeconds??0)+frameSeconds;
  state.sampleFrames=(state.sampleFrames??0)+1;
  if(state.sampleSeconds<0.5-1e-6)return state.scale;
  const elapsed=state.sampleSeconds,mean=elapsed/state.sampleFrames;
  state.sampleSeconds=0;state.sampleFrames=0;
  const budget=1/Math.max(15,Number.isFinite(targetFps)?targetFps:60);
  if(mean>budget*1.15){
    state.slowSeconds+=elapsed;state.fastSeconds=0;
    if(state.slowSeconds>=2-1e-6){state.scale=Math.max(0.65,state.scale-0.1);state.slowSeconds=0;}
  // At a capped refresh rate spare GPU headroom is unobservable. Probe one small
  // step only after twelve stable seconds; sustained overload rolls back after two.
  }else if(mean<=budget*1.05){
    state.fastSeconds+=elapsed;state.slowSeconds=0;
    if(state.fastSeconds>=12-1e-6){state.scale=Math.min(1,state.scale+0.05);state.fastSeconds=0;}
  }else{state.slowSeconds=0;state.fastSeconds=0;}
  return state.scale;
}
