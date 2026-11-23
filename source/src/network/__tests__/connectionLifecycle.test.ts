import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NetworkClient } from '../networkClient';
import { useMultiplayerStore } from '@/store/multiplayerStore';

class FakeSocket {
  static OPEN = 1;
  static CONNECTING = 0;
  static instances: FakeSocket[] = [];
  readyState = 0;
  onopen: (() => void) | null = null;
  onclose: ((event: { code: number; reason: string }) => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  send = vi.fn();
  close = vi.fn(() => { this.readyState = 3; });
  constructor() { FakeSocket.instances.push(this); }
  open() { this.readyState = 1; this.onopen?.(); }
}

describe('multiplayer connection lifecycle', () => {
  let client: NetworkClient;
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('window', globalThis);
    vi.stubGlobal('WebSocket', FakeSocket);
    FakeSocket.instances = [];
    useMultiplayerStore.getState().reset();
    client = new NetworkClient();
  });
  afterEach(() => {
    client.disconnect();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });
  it('ignores a late close from the previous lobby mount', () => {
    client.connect('ws://localhost/ws');
    const old = FakeSocket.instances[0];
    client.disconnect();
    client.connect('ws://localhost/ws');
    const current = FakeSocket.instances[1];
    current.open();
    old.onclose?.({ code: 1006, reason: '' });
    client.requestRooms();
    expect(useMultiplayerStore.getState().status).toBe('in_lobby');
    expect(current.send).toHaveBeenLastCalledWith('{"type":"request_rooms"}');
    vi.advanceTimersByTime(15000);
    expect(FakeSocket.instances).toHaveLength(2);
  });
  it('does not replay an abandoned room action after intentional disconnect', () => {
    client.connect('ws://localhost/ws');
    client.createRoom('Discarded', 'Driver', 'car');
    client.disconnect();
    client.connect('ws://localhost/ws');
    const current = FakeSocket.instances[1];
    current.open();
    expect(current.send.mock.calls.map(call => call[0]).join('')).not.toContain('create_room');
  });
  it('rejoins its last confirmed room after a transport drop', () => {
    client.connect('ws://localhost/ws');
    const first = FakeSocket.instances[0];
    first.open();
    client.handleMessage(new MessageEvent('message', { data: JSON.stringify({
      type: 'room_joined', selfId: 'driver1', players: [],
      room: { id: 'ABC123', name: 'Room', hostId: 'driver2', hostNickname: 'Friend',
        levelId: 'level1_island', gameMode: 'freeroam', playerCount: 2,
        maxPlayers: 12, createdAt: 1, isPersistent: false },
    }) }));
    first.readyState = 3;
    first.onclose?.({ code: 1006, reason: '' });
    vi.advanceTimersByTime(1000);
    const replacement = FakeSocket.instances[1];
    replacement.open();
    expect(replacement.send).toHaveBeenCalledWith(expect.stringContaining('"roomId":"ABC123"'));
  });
});
