export type MenuView = 'main' | 'activities' | 'start_mode' | 'options' | 'controls' | 'garage' | 'tracks' | 'credits' | 'multiplayer';
/** All control guides available to pointer, keyboard and controller navigation. */
export const CONTROLS_TABS = ['dualsense', 'xbox', 'keyboard', 'touch'] as const;
export type ControlsTab = typeof CONTROLS_TABS[number];
export type ResetConfirmState = 'idle' | 'confirming' | 'done';
export type SettingsCategory = 'graphics' | 'audio' | 'controls' | 'touch' | 'gameplay';
