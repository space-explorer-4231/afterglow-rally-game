import { expect, it } from 'vitest';
import { canSendTransient, MAX_TRANSIENT_QUEUE_BYTES } from '../transientDelivery';
it('only sends current telemetry over an open, uncongested connection', () => {
  expect(canSendTransient(1,0)).toBe(true); expect(canSendTransient(1,MAX_TRANSIENT_QUEUE_BYTES-1)).toBe(true);
  for (const state of [0,2,3]) expect(canSendTransient(state,0)).toBe(false);
  for (const queued of [MAX_TRANSIENT_QUEUE_BYTES,Infinity,NaN,-1]) expect(canSendTransient(1,queued)).toBe(false);
});
