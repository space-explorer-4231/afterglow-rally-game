import type { VehicleConfig } from '@/types/vehicle';

/** Convert inherited scaled arcade presets into kilogram-based road chassis. */
export function createRoadVehicleConfig(config: VehicleConfig): VehicleConfig {
  return { ...config, chassisMass: Math.max(1100, Math.min(2200, config.chassisMass * 8)) };
}
