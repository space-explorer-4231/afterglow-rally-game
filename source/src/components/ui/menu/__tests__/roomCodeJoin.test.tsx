import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { RoomSummary } from '@/types/network';
import { cycleRoomCodeDigit, normalizeRoomCode, resolveRoomCode } from '../roomCodeEntry';
import { RoomCodeJoin } from '../RoomCodeJoin';

const room: RoomSummary = {
  id: 'A1B2C3', name: 'Sunset friends', hostId: 'host', hostNickname: 'Swift Fox',
  levelId: 'level1_island', gameMode: 'timeattack', playerCount: 2, maxPlayers: 12, createdAt: 0,
};
const noop = () => {};

describe('friend room-code resolution', () => {
  it.each(['A1B2C3', ' a1b2c3 ', 'A1 B2 C3', 'a1-b2-c3', 'https://example.com/?room=a1b2c3'])('resolves copied code %s', code => {
    expect(resolveRoomCode(code, [room], true, false, false)).toEqual({ ok: true, room });
  });
  it.each(['', 'ABC', '0000000', 'QWERTY', '<b>ABC123</b>', 'javascript:alert(1)', 'https://example.com/no-code'])('rejects invalid input %s', code => {
    expect(resolveRoomCode(code, [room], true, false, false)).toMatchObject({ ok: false, message: expect.stringContaining('six-character') });
  });
  it('explains stale/closed rooms without selecting a different room', () => {
    expect(resolveRoomCode('ABCDEF', [room], true, false, false)).toEqual({ ok: false, message: expect.stringContaining('Room not found') });
  });
  it('explains connection, update and in-flight states without resolving a join', () => {
    expect(resolveRoomCode(room.id, [room], false, false, false)).toEqual({ ok: false, message: expect.stringContaining('Still connecting') });
    expect(resolveRoomCode(room.id, [room], true, true, false)).toEqual({ ok: false, message: expect.stringContaining('Reload') });
    expect(resolveRoomCode(room.id, [room], true, false, true)).toEqual({ ok: false, message: expect.stringContaining('already in progress') });
  });
  it('uses room capacity before a session/map is selected', () => {
    expect(resolveRoomCode(room.id, [{ ...room, playerCount: 12 }], true, false, false))
      .toEqual({ ok: false, message: expect.stringContaining('full') });
  });
  it('accepts a lowercase room-directory identifier and bounds hostile oversized input', () => {
    expect(resolveRoomCode('A1B2C3', [{ ...room, id: 'a1b2c3' }], true, false, false).ok).toBe(true);
    expect(normalizeRoomCode('A'.repeat(2049))).toBe('');
  });
});

describe('keyboard-free controller digit editing', () => {
  it('cycles every hexadecimal value and wraps in both directions', () => {
    let code = '000000';
    for (const digit of '123456789ABCDEF0') {
      code = cycleRoomCodeDigit(code, 2, 1);
      expect(code).toBe(`00${digit}000`);
    }
    expect(cycleRoomCodeDigit('000000', 0, -1)).toBe('F00000');
    expect(cycleRoomCodeDigit('F00000', 0, 1)).toBe('000000');
  });
  it('can compose a full invite with six selected positions', () => {
    let code = '';
    for (let index = 0; index < 6; index += 1) {
      const count = Number.parseInt(room.id[index], 16);
      for (let step = 0; step < count; step += 1) code = cycleRoomCodeDigit(code, index, 1);
    }
    expect(code).toBe(room.id);
    expect(resolveRoomCode(code, [room], true, false, false).ok).toBe(true);
  });
});

describe('compact room-code form', () => {
  function render(overrides: Partial<Parameters<typeof RoomCodeJoin>[0]> = {}) {
    return renderToStaticMarkup(<RoomCodeJoin active={false} pending={false} updateRequired={false}
      error={null} onActivate={noop} onChangeCode={noop} onJoinCode={noop} {...overrides} />);
  }
  it('provides one keyboard field and an explicit submit button', () => {
    const html = render();
    expect(html.match(/<input /g)).toHaveLength(1);
    expect(html).toContain('name="room-code"');
    expect(html).toContain('type="submit"');
    expect(html).toContain('Join by code');
    expect(html).toContain('then press Enter');
    expect(html).not.toContain('disabled=""');
  });
  it('announces validation and connection states without a modal or extra panel', () => {
    const html = render({ error: 'Room is full.', pending: true });
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('role="alert"');
    expect(html).toContain('aria-busy="true"');
    expect(html.match(/disabled=""/g)).toHaveLength(2);
    expect(html).toContain('Connecting…');
  });
});
