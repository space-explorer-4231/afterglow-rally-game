import { expect, it, vi } from 'vitest';
import { MAX_SNAPSHOT_QUEUE_BYTES, sendLatestSnapshot } from './snapshotDelivery.js';
it('skips stale snapshots for one congested peer without blocking a healthy peer, and resumes with the newest state', () => {
  const slow = {readyState:1,bufferedAmount:MAX_SNAPSHOT_QUEUE_BYTES,send:vi.fn()}, healthy = {readyState:1,bufferedAmount:0,send:vi.fn()};
  for (let i=0;i<10000;i++) { sendLatestSnapshot(slow, 'old'+i); sendLatestSnapshot(healthy, 'tick'+i); }
  expect(slow.send).not.toHaveBeenCalled(); expect(healthy.send).toHaveBeenCalledTimes(10000);
  slow.bufferedAmount=0; expect(sendLatestSnapshot(slow,'latest')).toBe(true); expect(slow.send).toHaveBeenCalledExactlyOnceWith('latest');
  slow.readyState=3; expect(sendLatestSnapshot(slow,'closed')).toBe(false);
});

