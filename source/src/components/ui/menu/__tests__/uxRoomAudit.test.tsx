import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { RoomSummary } from '@/types/network';
import { MultiplayerRoomCard } from '../MultiplayerRoomCard';
import { getRoomJoinAvailability } from '../roomJoinAvailability';
import { preserveNativeMenuKey } from '../menuKeyboard';
import { reconcileRoomActionFocus } from '../roomActionFocus';
import { CONTROLS_TABS } from '../types';
import { ControlsView } from '../ControlsView';

const room: RoomSummary = {
  id: 'ABC123', name: 'Evening race with friends', hostId: 'host', hostNickname: 'Swift Fox',
  levelId: 'level1_island', gameMode: 'timeattack', playerCount: 2, maxPlayers: 12, createdAt: 0,
};
const noop = () => {};

function card(overrides: Partial<Parameters<typeof MultiplayerRoomCard>[0]> = {}) {
  return renderToStaticMarkup(<MultiplayerRoomCard room={room} canDelete={false}
    joinFocused={false} deleteFocused={false} updateRequired={false} joining={false} deleteArmed={false}
    onJoin={noop} onDelete={noop} onFocusJoin={noop} onFocusDelete={noop} {...overrides} />);
}

describe('room browsing usability audit', () => {
  it('exposes a named, enabled join button without pointer hover or virtual focus', () => {
    const html = card();
    expect(html).toMatch(/class="club-room-join"[^>]*aria-label="Join room: Evening race with friends"/);
    expect(html).toContain('>Join room</button>');
    expect(html).not.toContain('disabled=');
    expect(html).not.toContain('data-gamepad-focused=');
    expect(html).toContain('class="club-room-actions"');
    expect(html).toContain('Room code <strong>ABC123</strong>');
  });

  it('renders full rooms with an explanatory disabled action instead of a failing join', () => {
    const html = card({ room: { ...room, playerCount: 12 } });
    expect(html).toContain('disabled=""');
    expect(html).toContain('>Room full</button>');
    expect(html).toContain('Choose another room or create one.');
  });

  it('shows the same join state for custom and community rooms', () => {
    expect(card({ room: { ...room, isPersistent: true } })).toContain('>Join room</button>');
    expect(card()).toContain('>Join room</button>');
  });

  it('makes host deletion a named second confirmation rather than an icon-only browser dialog', () => {
    expect(card({ canDelete: true })).toContain('aria-label="Delete room: Evening race with friends"');
    const armed = card({ canDelete: true, deleteArmed: true });
    expect(armed).toContain('>Confirm delete</button>');
    expect(armed).toContain('aria-label="Confirm delete room: Evening race with friends"');
  });

  it.each([
    [false, false, 2, 'Join room', false],
    [false, false, 12, 'Room full', true],
    [false, false, 13, 'Room full', true],
    [false, true, 2, 'Connecting…', true],
    [true, true, 12, 'Update required', true],
  ] as const)('handles update=%s pending=%s count=%s consistently', (update, pending, count, label, disabled) => {
    expect(getRoomJoinAvailability({ playerCount: count, maxPlayers: 12 }, update, pending)).toMatchObject({ label, disabled });
  });
});

describe('native keyboard controls are not hijacked by virtual menu focus', () => {
  it.each(['BUTTON', 'A', 'SUMMARY', 'INPUT'])('preserves Enter and Space on focused %s', tag => {
    expect(preserveNativeMenuKey(tag, 'Enter')).toBe(true);
    expect(preserveNativeMenuKey(tag, 'Space')).toBe(true);
  });
  it('preserves arrow changes on range sliders and selects', () => {
    expect(preserveNativeMenuKey('INPUT', 'ArrowRight', 'range')).toBe(true);
    expect(preserveNativeMenuKey('SELECT', 'ArrowDown')).toBe(true);
    expect(preserveNativeMenuKey('SELECT', 'Escape')).toBe(false);
    expect(preserveNativeMenuKey('INPUT', 'Escape', 'range')).toBe(false);
  });
  it('retains virtual arrow and confirm navigation for non-native surfaces', () => {
    expect(preserveNativeMenuKey('DIV', 'Enter')).toBe(false);
    expect(preserveNativeMenuKey('BUTTON', 'ArrowDown')).toBe(false);
    expect(preserveNativeMenuKey('BODY', 'Enter')).toBe(false);
  });
});

describe('live room refresh keeps controller intent on the same room', () => {
  const otherRoom = { ...room, id: 'DEF456', hostId: 'another-host' };
  it('follows a room when the list is reordered', () => {
    expect(reconcileRoomActionFocus({ area: 'room_join', index: 0 }, [room, otherRoom], [otherRoom, room], null))
      .toEqual({ area: 'room_join', index: 1 });
  });
  it('moves away from a removed room instead of joining the room that replaces its row', () => {
    expect(reconcileRoomActionFocus({ area: 'room_join', index: 0 }, [room, otherRoom], [otherRoom], null))
      .toEqual({ area: 'create_toggle' });
  });
  it('drops delete focus after host ownership changes', () => {
    expect(reconcileRoomActionFocus({ area: 'room_delete', index: 0 }, [room], [{ ...room, hostId: 'new-host' }], 'host'))
      .toEqual({ area: 'room_join', index: 0 });
  });
});

describe('touch control instructions have the same navigation path as other guides', () => {
  it('includes touch in the shared controller cycle and renders the controlled guide', () => {
    expect(CONTROLS_TABS).toEqual(['dualsense', 'xbox', 'keyboard', 'touch']);
    const html = renderToStaticMarkup(<ControlsView gamepadConnected={false} gamepadName="" gamepadType={null}
      controlsTab="touch" focusedIndex={0} textColor="#fff" onPointerMoveItem={noop}
      onSetControlsTab={noop} onSelectView={noop} />);
    expect(html).toContain('data-testid="controls-tab-touch" aria-pressed="true"');
    expect(html).toContain('Touch &amp; Drag anywhere in Left Zone');
  });
});
