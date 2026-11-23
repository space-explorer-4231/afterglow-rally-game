import { beforeEach, describe, expect, it } from 'vitest';
import { useMultiplayerStore } from '../multiplayerStore';
import { useRacingStore } from '../racingStore';
describe('Shared countdown cannot be overridden by local loading/recovery paths', () => {
  beforeEach(() => { useMultiplayerStore.getState().reset(); useRacingStore.getState().resetRace(); });
  function joinRace() {
    useMultiplayerStore.getState().setCurrentRoom({id:'ABC123',name:'Race',hostId:'a',hostNickname:'Host',
      levelId:'level6_gymkhana_harbor',gameMode:'timeattack',playerCount:1,maxPlayers:12,createdAt:1});
  }
  it('blocks loading-screen and checkpoint automatic starts in a room', () => {
    joinRace();
    useRacingStore.getState().startCountdown();
    useRacingStore.getState().passCheckpoint(0);
    expect(useRacingStore.getState().raceStatus).toBe('idle');
    expect(useRacingStore.getState().countdown).toBeNull();
  });
  it('does not let frame-delta countdown ticking alter a server-owned countdown', () => {
    joinRace(); useRacingStore.setState({raceStatus:'countdown',countdown:2});
    useRacingStore.getState().tickCountdown(10);
    expect(useRacingStore.getState().raceStatus).toBe('countdown');
    expect(useRacingStore.getState().countdown).toBe(2);
  });
  it('preserves single-player automatic starts', () => {
    useRacingStore.getState().startCountdown();
    useRacingStore.getState().tickCountdown(3.2);
    expect(useRacingStore.getState().raceStatus).toBe('racing');
  });
});
