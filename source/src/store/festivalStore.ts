import {create} from 'zustand';
/** A per-map local discovery trail; it never changes room or race state. */
export const useFestivalStore=create<{mask:number;total:number;setProgress:(mask:number,total:number)=>void}>()(set=>({
  mask:0,total:0,setProgress:(mask,total)=>set({mask,total}),
}));
