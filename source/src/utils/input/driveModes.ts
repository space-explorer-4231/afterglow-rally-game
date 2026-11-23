import { useSettingsStore } from '@/store/settingsStore';
import type { DrivetrainMode } from '@/types/settings';
const MODES: readonly DrivetrainMode[] = ['AWD', 'RWD', 'FWD'];
/** Cycle torque routing from keyboard, touch or controller. */
export function cycleDrivetrain(): void {
  const state = useSettingsStore.getState();
  state.setDrivetrainMode(MODES[(MODES.indexOf(state.drivetrainMode) + 1) % MODES.length]);
}
/** Switch transmission while keeping the current engaged gear. */
export function toggleTransmission(): void {
  const state = useSettingsStore.getState();
  state.setTransmissionMode(state.transmissionMode === 'automatic' ? 'manual' : 'automatic');
}
/** Toggle a saved speed display preference without altering physics. */
export function toggleSpeedUnit(): void {
  const state = useSettingsStore.getState();
  state.setSpeedUnit(state.speedUnit === 'kmh' ? 'mph' : 'kmh');
}
