import { afterEach, describe, expect, it, vi } from 'vitest';
import { watchAssetProgress } from '../assetProgress';

afterEach(() => vi.useRealTimers());
describe('bounded asset progress notifications', () => {
  it('coalesces a burst of image completions into one UI update', () => {
    vi.useFakeTimers();
    const source={active:true,progress:0};const emit=vi.fn();
    const stop=watchAssetProgress(()=>source,emit);
    for(let i=1;i<=100;i++)source.progress=i;
    expect(emit).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(emit).toHaveBeenCalledTimes(1);
    expect(emit).toHaveBeenLastCalledWith({active:true,progress:100});
    source.active=false;vi.advanceTimersByTime(100);
    expect(emit).toHaveBeenLastCalledWith({active:false,progress:100});
    stop();
  });
  it('does not notify for identical state and cancels pending work on cleanup', () => {
    vi.useFakeTimers();const source={active:false,progress:100};const emit=vi.fn();
    const stop=watchAssetProgress(()=>source,emit);
    vi.advanceTimersByTime(1000);expect(emit).not.toHaveBeenCalled();
    stop();source.active=true;source.progress=5;
    vi.advanceTimersByTime(1000);expect(emit).not.toHaveBeenCalled();
  });
  it('sanitizes non-finite loading counters before displaying progress', () => {
    vi.useFakeTimers();const source={active:true,progress:50};const emit=vi.fn();
    const stop=watchAssetProgress(()=>source,emit);
    source.progress=NaN;vi.advanceTimersByTime(100);
    expect(emit).toHaveBeenLastCalledWith({active:true,progress:0});
    source.progress=1000;vi.advanceTimersByTime(100);
    expect(emit).toHaveBeenLastCalledWith({active:true,progress:100});stop();
  });
});
