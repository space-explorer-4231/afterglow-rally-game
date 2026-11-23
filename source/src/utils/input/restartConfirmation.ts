export const RESTART_CONFIRMATION_MS = 2000;
export interface RestartConfirmationState { deadline: number; pending: boolean }
export function createRestartConfirmation(): RestartConfirmationState { return { deadline: 0, pending: false }; }
/** Returns true only for a second distinct key-down within the confirmation window. */
export function requestRestart(state: RestartConfirmationState, now: number, repeated = false): boolean {
  if (repeated || !Number.isFinite(now)) return false;
  if (state.deadline > now) { state.deadline = 0; state.pending = true; return true; }
  state.deadline = now + RESTART_CONFIRMATION_MS; return false;
}
export function cancelRestart(state: RestartConfirmationState): void { state.deadline = 0; state.pending = false; }
export function consumeRestart(state: RestartConfirmationState): boolean { const result = state.pending; state.pending = false; return result; }
