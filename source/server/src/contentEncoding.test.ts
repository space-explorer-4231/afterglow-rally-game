import { describe, it, expect } from 'vitest';
import { acceptedEncodings } from './contentEncoding.js';
describe('HTTP compression negotiation', () => {
  it('prefers Brotli at equal quality and respects client weighting', () => {
    expect(acceptedEncodings('gzip, br')).toEqual(['br', 'gzip']);
    expect(acceptedEncodings('br;q=0.5, gzip;q=1')).toEqual(['gzip', 'br']);
  });
  it('never sends an explicitly forbidden encoding or assumes support', () => {
    expect(acceptedEncodings('br;q=0, *;q=1')).toEqual(['gzip']);
    expect(acceptedEncodings(undefined)).toEqual([]);
    expect(acceptedEncodings('gzip;q=invalid, br;q=0')).toEqual([]);
  });
});
