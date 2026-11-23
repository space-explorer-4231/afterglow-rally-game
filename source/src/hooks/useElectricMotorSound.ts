import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { getSharedAudioContext } from '@/utils/audio/audioContext';
import { useGameStore } from '@/store/gameStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useMultiplayerStore } from '@/store/multiplayerStore';
import { sessionVolume } from '@/utils/quietSession';

/** A quiet speed-linked electric whine, with no exhaust pulse loop. */
export function useElectricMotorSound(enabled: boolean) {
  const nodes = useRef<{ context: AudioContext; oscillator: OscillatorNode; gain: GainNode } | null>(null);
  useEffect(() => {
    if (!enabled) return;
    const context = getSharedAudioContext();
    if (!context) return;
    const oscillator = context.createOscillator(), gain = context.createGain();
    oscillator.type = 'sine'; oscillator.frequency.value = 180; gain.gain.value = 0;
    oscillator.connect(gain); gain.connect(context.destination); oscillator.start();
    nodes.current = { context, oscillator, gain };
    return () => { nodes.current = null; oscillator.stop(); oscillator.disconnect(); gain.disconnect(); };
  }, [enabled]);
  useFrame(() => {
    const audio = nodes.current;
    if (!audio || audio.context.state === 'closed') return;
    const state = useGameStore.getState(), speed = Number.isFinite(state.speed) ? Math.min(350, Math.abs(state.speed)) : 0;
    const audible = state.gameState === 'playing' && !useMultiplayerStore.getState().isSpectating;
    audio.oscillator.frequency.setTargetAtTime(180 + speed * 4, audio.context.currentTime, .08);
    audio.gain.gain.setTargetAtTime(audible ? Math.min(.06, speed * .002) * sessionVolume(useSettingsStore.getState().sfxVolume) : 0, audio.context.currentTime, .04);
  });
}
