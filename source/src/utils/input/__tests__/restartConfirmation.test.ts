import { expect, it } from 'vitest';
import { cancelRestart, consumeRestart, createRestartConfirmation, requestRestart } from '../restartConfirmation';
import { blendInputs } from '@/hooks/useInput';
it('requires two distinct presses and emits exactly one reset pulse', () => {
  const state = createRestartConfirmation();
  expect(requestRestart(state, 100)).toBe(false); expect(consumeRestart(state)).toBe(false);
  for (let now = 150; now < 1500; now += 50) expect(requestRestart(state, now, true)).toBe(false);
  expect(requestRestart(state, 1600)).toBe(true); expect(consumeRestart(state)).toBe(true); expect(consumeRestart(state)).toBe(false);
});
it('expires, cancels on interruption and rejects invalid timestamps', () => {
  const state = createRestartConfirmation(); requestRestart(state, 100);
  expect(requestRestart(state, 2100)).toBe(false); cancelRestart(state);
  expect(requestRestart(state, 2200)).toBe(false); expect(requestRestart(state, NaN)).toBe(false);
  cancelRestart(state); expect(consumeRestart(state)).toBe(false);
});
it('filters raw keyboard R while preserving explicit touch/gamepad recovery', () => {
  const base = { dt:1/60,prevSteering:0,keys:new Set(['KeyR']),kbReset:false };
  expect(blendInputs(base).state.reset).toBe(false);
  expect(blendInputs({...base,kbReset:true}).state.reset).toBe(true);
  expect(blendInputs({...base,gp:{resetToggle:true}}).state.reset).toBe(true);
  expect(blendInputs({...base,touch:{reset:true}}).state.reset).toBe(true);
});
