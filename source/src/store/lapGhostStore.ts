import {create} from 'zustand';
import type {LapGhostRecord} from '@/utils/lapGhost';

/** Presentation state; high-frequency pose data remains in typed recording buffers. */
interface LapGhostView {
  record:LapGhostRecord|null;
  message:string;
  splitDelta:number|null;
  checkpoint:number;
}
/** Personal replay state, separate from multiplayer vehicles and race authority. */
export const useLapGhostStore=create<LapGhostView>(()=>({record:null,message:'Complete a clean lap to create your ghost',splitDelta:null,checkpoint:0}));
