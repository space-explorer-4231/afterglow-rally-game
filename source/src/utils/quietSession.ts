/** An opt-in, tab-local testing mute that never changes the saved game volumes. */
export function isQuietSession(): boolean {
  return typeof window !== 'undefined' &&
    new URLSearchParams(window.location?.search ?? '').get('quiet') === '1';
}

/** Keeps the game's normal volume available outside this chat's test tabs. */
export function sessionVolume(volume: number): number {
  return isQuietSession() ? 0 : volume;
}
