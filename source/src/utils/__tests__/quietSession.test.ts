import { afterEach, expect, it, vi } from 'vitest';
import { sessionVolume } from '../quietSession';
afterEach(() => vi.unstubAllGlobals());
it('mutes only a deliberately quiet test tab', () => {
  vi.stubGlobal('window', { location: { search: '?quiet=1' } });
  expect(sessionVolume(0.5)).toBe(0);
  vi.stubGlobal('window', { location: { search: '' } });
  expect(sessionVolume(0.5)).toBe(0.5);
});
