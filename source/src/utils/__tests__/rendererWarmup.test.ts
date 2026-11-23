import {it,expect,vi} from 'vitest';
import {warmRenderer} from '../rendererWarmup';
it('waits for asynchronous compilation and two covered frames',async()=>{
 let resolve:()=>void=()=>{};const compile=vi.fn(()=>new Promise<void>(done=>{resolve=done;})),ready=vi.fn(),frames:(()=>void)[]=[];
 const stop=warmRenderer(compile,callback=>frames.push(callback),vi.fn(),ready,vi.fn());await Promise.resolve();expect(compile).toHaveBeenCalledOnce();expect(frames).toHaveLength(0);expect(ready).not.toHaveBeenCalled();
 resolve();await new Promise<void>(done=>setTimeout(done,0));expect(frames).toHaveLength(1);frames[0]();expect(ready).not.toHaveBeenCalled();frames[1]();expect(ready).toHaveBeenCalledOnce();stop();
});
it('cancels stale readiness when cars or maps change',async()=>{let resolve:()=>void=()=>{};const ready=vi.fn(),frames=vi.fn(()=>1);const stop=warmRenderer(()=>new Promise<void>(done=>{resolve=done;}),frames,vi.fn(),ready,vi.fn());await Promise.resolve();stop();resolve();await new Promise<void>(done=>setTimeout(done,0));expect(frames).not.toHaveBeenCalled();expect(ready).not.toHaveBeenCalled();});
it('cleans pending covered frames and falls back after a compilation error',async()=>{const frames:(()=>void)[]=[],failed=vi.fn(),cancel=vi.fn();const stop=warmRenderer(()=>Promise.reject(Error('driver')),callback=>frames.push(callback),cancel,vi.fn(),failed);await new Promise<void>(done=>setTimeout(done,0));expect(failed).toHaveBeenCalledOnce();stop();expect(cancel).toHaveBeenCalledWith(1);});
it('releases a stalled compiler after the watchdog and ignores its late completion',async()=>{
 vi.useFakeTimers();try{let resolve:()=>void=()=>{};const frames:(()=>void)[]=[],ready=vi.fn(),failed=vi.fn();const stop=warmRenderer(()=>new Promise<void>(done=>{resolve=done;}),callback=>frames.push(callback),vi.fn(),ready,failed);await Promise.resolve();await vi.advanceTimersByTimeAsync(2499);expect(frames).toHaveLength(0);await vi.advanceTimersByTimeAsync(1);expect(failed).toHaveBeenCalledOnce();frames[0]();frames[1]();expect(ready).toHaveBeenCalledOnce();resolve();await Promise.resolve();await Promise.resolve();expect(frames).toHaveLength(2);stop();}finally{vi.useRealTimers();}
});
it('cancels a stalled compilation watchdog on unmount',async()=>{vi.useFakeTimers();try{const ready=vi.fn(),failed=vi.fn(),frame=vi.fn(()=>1);const stop=warmRenderer(()=>new Promise(()=>{}),frame,vi.fn(),ready,failed);await Promise.resolve();stop();await vi.advanceTimersByTimeAsync(3000);expect(frame).not.toHaveBeenCalled();expect(failed).not.toHaveBeenCalled();}finally{vi.useRealTimers();}});
