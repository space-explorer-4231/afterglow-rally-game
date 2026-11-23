import type { SpeedUnit } from '@/types/settings';

/** Display conversion only: simulation and network values remain km/h and metres. */
export function displaySpeed(kmh: number, unit: SpeedUnit): number {
  return unit === 'mph' ? kmh / 1.609344 : kmh;
}
/** Human-readable speed label shared by instruments and driving instructions. */
export function speedUnitLabel(unit: SpeedUnit): string {
  return unit === 'mph' ? 'MPH' : 'KM/H';
}
/** Keep advice consistent with the actual physics speeds after changing units. */
export function driftSpeedRange(unit: SpeedUnit): string {
  return `${Math.round(displaySpeed(35, unit))}–${Math.round(displaySpeed(65, unit))} ${unit === 'mph' ? 'mph' : 'km/h'}`;
}
/** The cruise challenge retains the same one-kilometre objective in either unit system. */
export function cruiseDistanceLabel(metres: number, unit: SpeedUnit): string {
  return unit === 'mph' ? `${(metres / 1609.344).toFixed(2)} / 0.62 mi` : `${(metres / 1000).toFixed(2)} / 1 km`;
}
