import {create} from 'zustand';
import type {FestivalPlayback} from '@/utils/audio/festivalPlayer';
/** Track changes only; no audio-position updates enter the React render loop. */
export const useFestivalMusicStore=create<{index:number;status:FestivalPlayback;setTrack:(index:number,status:FestivalPlayback)=>void}>()(set=>({
 index:0,status:'waiting',setTrack:(index,status)=>set(state=>state.index===index&&state.status===status?state:{index,status}),
}));
