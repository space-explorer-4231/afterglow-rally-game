import {expect,it} from 'vitest';
import {captureReset,clearReset,consumeReset,createResetLatch} from '../resetLatch';
import {consumeRestart,createRestartConfirmation,requestRestart} from '../restartConfirmation';
it.each([1,2,4,8])('preserves a confirmed double R across %s physics steps before rendering',steps=>{
  const confirmation=createRestartConfirmation(),latch=createResetLatch();
  requestRestart(confirmation,100);captureReset(latch,consumeRestart(confirmation));
  expect(consumeReset(latch)).toBe(false);
  requestRestart(confirmation,400);captureReset(latch,consumeRestart(confirmation));
  for(let i=0;i<steps;i++)captureReset(latch,consumeRestart(confirmation));
  expect(consumeReset(latch)).toBe(true);expect(consumeReset(latch)).toBe(false);
});
it('does not repeat a recovery while a controller button remains held',()=>{
  const s=createResetLatch();captureReset(s,true);expect(consumeReset(s)).toBe(true);
  for(let i=0;i<50;i++){captureReset(s,true);expect(consumeReset(s)).toBe(false);}
  captureReset(s,false);captureReset(s,true);expect(consumeReset(s)).toBe(true);
});
it('cancels a queued recovery on phase or vehicle changes',()=>{
  const s=createResetLatch();captureReset(s,true);clearReset(s);expect(consumeReset(s)).toBe(false);
});
