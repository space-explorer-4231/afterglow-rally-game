/** Original 112 BPM composition; no sampled recordings or borrowed melodies. */
export const CLUB_BPM=112;
const ROOTS=[45,41,48,43];
const MELODY=[12,19,16,24,19,16,14,19,12,16,19,26,24,19,16,14];
export function clubNote(step:number):{bass:number;lead:number;chord:readonly number[];kick:boolean;snare:boolean} {
  const root=ROOTS[Math.floor(step/32)%4];
  const melody=MELODY[Math.floor(step/2)%16];
  return {bass:root+(step%8===6?7:0),lead:root+(root===45&&melody===16?15:melody),chord:[root+12,root+(root===45?15:16),root+19],kick:step%4===0||step%16===14,snare:step%8===4};
}
export function clubIntensity(speed:number,boost:boolean):number {
  return Math.min(1,Math.max(0,Number.isFinite(speed)?Math.abs(speed)/180:0)+(boost?.3:0));
}

/** Bounded look-ahead sequencer. Every short-lived source disconnects on completion. */
export class ClubScore {
  private readonly output:GainNode;
  private readonly filter:BiquadFilterNode;
  private readonly voices=new Map<AudioScheduledSourceNode,GainNode>();
  private readonly noise:AudioBuffer;
  private step=0;
  private next=0;
  private readonly context:AudioContext;
  constructor(context:AudioContext){
    this.context=context;
    this.output=context.createGain();this.output.gain.value=0;
    this.filter=context.createBiquadFilter();this.filter.type='lowpass';this.filter.frequency.value=2400;
    this.filter.connect(this.output);this.output.connect(context.destination);
    this.noise=context.createBuffer(1,Math.ceil(context.sampleRate*.2),context.sampleRate);
    const samples=this.noise.getChannelData(0);let seed=1234567,previous=0;
    for(let i=0;i<samples.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const value=seed/2147483648-1;samples[i]=(value-previous)*.5;previous=value;}
  }
  tick(volume:number,intensity:number,nightMix=false):void {
    const now=this.context.currentTime;
    const level=Number.isFinite(volume)?Math.min(1,Math.max(0,volume)):0;
    this.output.gain.setTargetAtTime(level,now,.12);
    intensity=Number.isFinite(intensity)?Math.max(0,Math.min(1,intensity)):0;
    this.filter.frequency.setTargetAtTime(1800+intensity*4500,now,.15);
    if(level<=0||this.context.state!=='running'){this.next=now;return;}
    if(this.next<now)this.next=now+.03;
    while(this.next<now+.16){this.beat(this.next+(this.step%2?.011:0),intensity,nightMix);this.step=(this.step+1)%128;this.next+=60/CLUB_BPM/4;}
  }
  dispose():void {
    for(const [voice,envelope] of this.voices){voice.onended=null;try{voice.stop();}catch{/* Source already ended. */}voice.disconnect();envelope.disconnect();}
    this.voices.clear();this.filter.disconnect();this.output.disconnect();
  }
  private tone(midi:number,time:number,duration:number,level:number,type:OscillatorType):void {
    const voice=this.context.createOscillator(),envelope=this.context.createGain();
    voice.type=type;voice.frequency.value=440*2**((midi-69)/12);
    envelope.gain.setValueAtTime(.0001,time);envelope.gain.exponentialRampToValueAtTime(level,time+.012);
    envelope.gain.exponentialRampToValueAtTime(.0001,time+duration);
    voice.connect(envelope);envelope.connect(this.filter);this.voices.set(voice,envelope);
    voice.onended=()=>{voice.disconnect();envelope.disconnect();this.voices.delete(voice);};
    voice.start(time);voice.stop(time+duration+.02);
  }
  private beat(time:number,intensity:number,nightMix:boolean):void {
    const note=clubNote(this.step);
    if(this.step%2===0)this.tone(note.bass,time,.18,.23,'triangle');
    if(this.step%4===0)this.tone(note.lead,time,.25,.065+intensity*.035,'sine');
    if(this.step%16===0)for(const midi of note.chord)this.tone(midi,time,1.3,.025,'triangle');
    if(note.kick){this.tone(28,time,.13,.5,'sine');this.tone(43,time,.045,.2,'sine');}
    if(note.snare){this.noiseHit(time,.11,.17);this.tone(50,time,.07,.08,'triangle');}
    if(this.step%2===1)this.noiseHit(time,this.step%16===15?.07:.025,.045+intensity*.025);
    if(intensity>.6&&this.step%2===1)this.tone(note.lead+12,time,.07,.025,'triangle');
    if(nightMix&&this.step%8===6)this.tone(note.lead+7,time,.42,.035,'sine');
  }
  private noiseHit(time:number,duration:number,level:number):void {
    const voice=this.context.createBufferSource(),envelope=this.context.createGain();voice.buffer=this.noise;
    envelope.gain.setValueAtTime(level,time);envelope.gain.exponentialRampToValueAtTime(.0001,time+duration);
    voice.connect(envelope);envelope.connect(this.filter);this.voices.set(voice,envelope);
    voice.onended=()=>{voice.disconnect();envelope.disconnect();this.voices.delete(voice);};voice.start(time);voice.stop(time+duration+.01);
  }
}
