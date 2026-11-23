import { describe, expect, it } from 'vitest';
import { getRenderBudget } from '../renderBudget';

describe('scene rendering budget', () => {
  it('honors the selected presentation rate without platform exceptions', () => {
    for (const fps of [30, 60, 120]) {
      expect(getRenderBudget('playing', true, false, fps)).toEqual({ enabled: true, targetFps: fps });
    }
  });
  it('stops hidden scenes and the world behind the garage', () => {
    expect(getRenderBudget('playing', false, false, 60).enabled).toBe(false);
    expect(getRenderBudget('menu', true, true, 60).enabled).toBe(false);
  });
  it('reduces paused and menu work even when high frame rates are selected', () => {
    expect(getRenderBudget('paused', true, false, 120).targetFps).toBe(10);
    expect(getRenderBudget('menu', true, false, 120).targetFps).toBe(30);
  });
});
