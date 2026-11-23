import { raceCountdownDigit } from '@/utils/multiplayerRaceClock';
import { useEffect } from 'react';
import { useMultiplayerStore } from '@/store/multiplayerStore';
import { useGameStore } from '@/store/gameStore';
import { useRacingStore } from '@/store/racingStore';
import { playCountdownBeep } from '@/utils/countdownSound';

/** Align grid, countdown, spectators and GO with the room's server epoch, including late packets. */
export function useMultiplayerRaceStart(): void {
  useEffect(() => {
    let gridKey = '';
    let countdownKey = '';
    let startedKey = '';
    let lastDigit: number | null = null;
    let syncing = false;
    const sync = () => {
      if (syncing) return;
      syncing = true;
      try {
      const mp = useMultiplayerStore.getState();
      if (mp.currentRoom?.gameMode !== 'timeattack' || !mp.selfId) {
        gridKey = countdownKey = startedKey = '';
        return;
      }
      const state = mp.raceStart;
      if (!state) return;
      const key = `${mp.currentRoom.id}:${state.round}:${mp.selfId}`;
      const racing = useRacingStore.getState();
      if (state.phase === 'waiting') {
        if (gridKey !== key) {
          gridKey = key;
          countdownKey = startedKey = '';
          lastDigit = null;
          mp.setSpectating(false);
          racing.resetRace();
          useGameStore.getState().triggerReset(true);
        }
        return;
      }
      if (!state.racerIds.includes(mp.selfId)) {
        if (!mp.isSpectating) {
          const target = state.racerIds[0] ?? null;
          mp.setSpectating(true, target, target ? mp.remotePlayers[target]?.nickname : null);
          racing.resetRace();
        }
        return;
      }
      const outcome=mp.raceRound?.round===state.round?mp.raceRound.standings.find(driver=>driver.id===mp.selfId):null;
      if(state.phase==='results'||(outcome&&outcome.status!=='racing')){
        useRacingStore.setState({raceStatus:'completed',countdown:null});
        return;
      }
      if (state.startAt === null) return;
      if (countdownKey !== key) {
        countdownKey = key;
        mp.setSpectating(false);
        racing.resetRace();
        useGameStore.getState().triggerReset(true);
        useRacingStore.setState({raceStatus: 'countdown', currentCheckpoint: 1});
      }
      const elapsed = (Date.now() + mp.serverClockOffset - state.startAt) / 1000;
      if (elapsed < 0) {
        const digit = raceCountdownDigit(state.startAt, Date.now() + mp.serverClockOffset);
        if (digit !== lastDigit) {
          lastDigit = digit;
          useRacingStore.setState({countdown: digit});
          playCountdownBeep(false);
        }
      } else if (startedKey !== key) {
        startedKey = key;
        racing.startRace();
        useRacingStore.setState({countdown: elapsed < .7 ? 0 : null, currentLapTime: Math.max(0, elapsed)});
        playCountdownBeep(true);
      } else if (elapsed >= .7 && racing.countdown !== null) {
        useRacingStore.setState({countdown: null});
      }
      } finally {syncing = false;}
    };
    const unsubscribe = useMultiplayerStore.subscribe(sync);
    const timer = setInterval(sync, 50);
    sync();
    return () => { unsubscribe(); clearInterval(timer); };
  }, []);
}
