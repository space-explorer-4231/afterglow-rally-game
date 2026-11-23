import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NetworkClient } from '../networkClient';
import { useGameStore } from '@/store/gameStore';
import { useMultiplayerStore } from '@/store/multiplayerStore';
import type { RoomSummary } from '@/types/network';

describe('Race map readiness when joining and reconnecting', () => {
  beforeEach(() => {
    useMultiplayerStore.getState().reset();
    useGameStore.getState().setSelectedLevelId('level6_gymkhana_harbor');
    useGameStore.setState({isSceneReady:true,isRenderReady:true,isVehicleVisualReady:true});
  });
  afterEach(() => vi.restoreAllMocks());
  const room: RoomSummary = { id: 'AABBCC', name: 'Shared Grid', hostId: 'host', hostNickname: 'Host',
    levelId: 'level6_gymkhana_harbor', gameMode: 'timeattack', playerCount: 1, maxPlayers: 12, createdAt: 1 };
  it('keeps an already-loaded map ready on reconnect', () => {
    const client = new NetworkClient();
    const ready = vi.spyOn(client, 'sendClientReady').mockImplementation(() => {});
    client.handleMessage(new MessageEvent('message', {data: JSON.stringify({type: 'room_joined', selfId: 'host', room, players: []})}));
    expect(useGameStore.getState().isSceneReady).toBe(true);
    expect(ready).toHaveBeenCalledOnce();
  });
  it('does not acknowledge the previous map as ready for a different room map', () => {
    const client = new NetworkClient();
    const ready = vi.spyOn(client, 'sendClientReady').mockImplementation(() => {});
    client.handleMessage(new MessageEvent('message', {data: JSON.stringify({type: 'room_joined', selfId: 'host',
      room: {...room, levelId: 'level2_desert'}, players: []})}));
    expect(useGameStore.getState().selectedLevelId).toBe('level2_desert');
    expect(useGameStore.getState().isSceneReady).toBe(false);
    expect(ready).not.toHaveBeenCalled();
  });
  it.each(['isRenderReady','isVehicleVisualReady'] as const)('does not report ready before %s is complete',field=>{
    useGameStore.setState({[field]:false});const client=new NetworkClient(),ready=vi.spyOn(client,'sendClientReady').mockImplementation(()=>{});
    client.handleMessage(new MessageEvent('message',{data:JSON.stringify({type:'room_joined',selfId:'host',room,players:[]})}));expect(ready).not.toHaveBeenCalled();
  });
});
