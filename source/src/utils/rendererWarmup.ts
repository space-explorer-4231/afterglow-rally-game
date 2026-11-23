/** Compile opportunistically; a stalled GPU promise must not trap a fully mounted scene. */
export function warmRenderer(compile:()=>Promise<unknown>,frame:(callback:()=>void)=>number,cancelFrame:(id:number)=>void,ready:()=>void,failed:(error:unknown)=>void):()=>void {
 let cancelled=false,finished=false,first=0,second=0;
 const finish=()=>{if(cancelled||finished)return;finished=true;clearTimeout(watchdog);first=frame(()=>{if(cancelled)return;second=frame(()=>{if(!cancelled)ready();});});};
 const watchdog=setTimeout(()=>{if(cancelled)return;failed(new Error('Shader warm-up timed out; continuing with on-demand compilation'));finish();},2500);
 void Promise.resolve().then(compile).catch(error=>{if(!cancelled)failed(error);}).then(finish);
 return()=>{cancelled=true;clearTimeout(watchdog);if(first)cancelFrame(first);if(second)cancelFrame(second);};
}
