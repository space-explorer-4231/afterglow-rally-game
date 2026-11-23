import type { GraphicsQuality, AntiAliasingMode } from './game';

export type TouchControlMode = 'auto' | 'always' | 'off';
export type TouchSteeringScheme = 'joystick' | 'buttons' | 'tilt';
export type TouchButtonSize = 'small' | 'medium' | 'large';

export interface TouchSettings {
  touchControlMode: TouchControlMode;
  touchSteeringScheme: TouchSteeringScheme;
  touchOpacity: number; // 0.2 to 1.0 (default 0.7)
  touchButtonSize: TouchButtonSize;
  touchHaptics: boolean;
  tiltSensitivity: number; // 0.5 to 2.0 (default 1.0)
  tiltDeadzone: number; // degrees, e.g. 1.0 to 5.0 (default 2.5)
  tiltMaxAngle: number; // degrees, e.g. 15.0 to 45.0 (default 28.0)
  tiltInvert: boolean; // default false
}

export const DEFAULT_TOUCH_SETTINGS: TouchSettings = {
  touchControlMode: 'auto',
  touchSteeringScheme: 'joystick',
  touchOpacity: 0.7,
  touchButtonSize: 'medium',
  touchHaptics: true,
  tiltSensitivity: 1.0,
  tiltDeadzone: 2.5,
  tiltMaxAngle: 28.0,
  tiltInvert: false,
};

export type TargetFps = 30 | 60 | 120;
export type DrawDistance = 'short' | 'medium' | 'far' | 'ultra';
export type TransmissionMode = 'automatic' | 'manual';
/** Driver-selected torque distribution. */
export type DrivetrainMode = 'FWD' | 'RWD' | 'AWD';
export type SpeedUnit = 'kmh' | 'mph';

export interface GameSettings extends TouchSettings {
  /** Visual atmosphere only; never changes networked handling. */
  weatherMode: 'clear' | 'rain';
  graphicsQuality: GraphicsQuality;
  targetFps: TargetFps;
  drawDistance: DrawDistance;
  antiAliasing: AntiAliasingMode;
  resolutionScale: number;
  dynamicResolution: boolean;
  shadowsEnabled: boolean;
  postProcessingEnabled: boolean;
  transmissionMode: TransmissionMode;
  drivetrainMode: DrivetrainMode;
  speedUnit: SpeedUnit;
  sensitivity: number;
  debugPhysics: boolean;
  sfxVolume: number;
  menuMusicVolume: number;
  gameMusicVolume: number;
  vibrationEnabled: boolean;
  vibrationIntensity: number;
  /** Anti-lock Braking System (prevents wheel lockup under hard braking) */
  absEnabled: boolean;
  /** Traction Control System (modulates engine throttle under excessive wheelspin) */
  tcsEnabled: boolean;
  /** Electronic Stability Program (yaw stability & countersteer damping assist) */
  espEnabled: boolean;
  /** Flag tracking whether the user has explicitly manually configured graphics preferences */
  graphicsConfiguredByUser?: boolean;
}

export const BALANCED_MOBILE_SETTINGS: Partial<GameSettings> = {
  graphicsQuality: 'medium',
  targetFps: 60,
  drawDistance: 'medium',
  antiAliasing: 'off',
  resolutionScale: 1.0,
  dynamicResolution: true,
  shadowsEnabled: false,
  postProcessingEnabled: false,
};

export const DEFAULT_SETTINGS: GameSettings = {
  weatherMode: 'clear',
  speedUnit: 'kmh',
  drivetrainMode: 'AWD',
  graphicsQuality: 'medium',
  targetFps: 60,
  drawDistance: 'short',
  antiAliasing: 'msaa',
  resolutionScale: 1.0,
  dynamicResolution: false,
  shadowsEnabled: false,
  postProcessingEnabled: false,
  transmissionMode: 'automatic',
  sensitivity: 1.0,
  debugPhysics: false,
  sfxVolume: 1.0,
  menuMusicVolume: 0.5,
  gameMusicVolume: 0.5,
  vibrationEnabled: true,
  vibrationIntensity: 1.0,
  absEnabled: true,
  tcsEnabled: true,
  espEnabled: true,
  graphicsConfiguredByUser: false,
  ...DEFAULT_TOUCH_SETTINGS,
};
