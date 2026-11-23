import {balanceClubClass} from './vehicles/clubClass';
import { SPEED_FLEET } from './vehicles/speedFleet';
import { VEHICLE_BMW_M3_DRIFT } from './vehicles/bmwM3Drift';
import { CONTACT_PROFILES } from './vehicles/contactProfiles';
import type { VehiclePreset } from '@/types/vehicle';
import { VEHICLE_PHANTOM_B } from './vehicles/phantomB';
import { VEHICLE_BANTAM_TURBO } from './vehicles/bantamTurbo';
import { VEHICLE_VANGUARD_GT } from './vehicles/vanguardGT';
import { VEHICLE_SHADOWFIRE_RS } from './vehicles/shadowfireRS';
import { VEHICLE_ZEPHYR_WR4 } from './vehicles/zephyrWR4';
import { VEHICLE_KODIAK_RAID } from './vehicles/kodiakRaid';
import { VEHICLE_VORTEX_B } from './vehicles/vortexB';
import { VEHICLE_STRADALE_GT } from './vehicles/stradaleGT';

// Export all 14 vehicle presets and configs
export { VEHICLE_PHANTOM_B, PHANTOM_B_VEHICLE_CONFIG } from './vehicles/phantomB';
export { VEHICLE_BANTAM_TURBO, BANTAM_TURBO_VEHICLE_CONFIG } from './vehicles/bantamTurbo';
export { VEHICLE_VANGUARD_GT, VANGUARD_GT_VEHICLE_CONFIG } from './vehicles/vanguardGT';
export { VEHICLE_SHADOWFIRE_RS, SHADOWFIRE_RS_VEHICLE_CONFIG } from './vehicles/shadowfireRS';
export { VEHICLE_ZEPHYR_WR4, ZEPHYR_WR4_VEHICLE_CONFIG } from './vehicles/zephyrWR4';
export { VEHICLE_KODIAK_RAID, KODIAK_RAID_VEHICLE_CONFIG } from './vehicles/kodiakRaid';
export { VEHICLE_VORTEX_B, VORTEX_B_VEHICLE_CONFIG } from './vehicles/vortexB';

// Backwards-compatibility aliases for legacy imports
export { VEHICLE_ZEPHYR_WR4 as VEHICLE_RALLY_HATCHBACK } from './vehicles/zephyrWR4';
export { VEHICLE_SHADOWFIRE_RS as VEHICLE_RALLY_WRC, SHADOWFIRE_RS_VEHICLE_CONFIG as WRC_VEHICLE_CONFIG } from './vehicles/shadowfireRS';
export { VEHICLE_PHANTOM_B as VEHICLE_CYCLONE_B, PHANTOM_B_VEHICLE_CONFIG as CYCLONE_B_VEHICLE_CONFIG } from './vehicles/phantomB';
export { VEHICLE_KODIAK_RAID as VEHICLE_TITAN_B, KODIAK_RAID_VEHICLE_CONFIG as TITAN_B_VEHICLE_CONFIG } from './vehicles/kodiakRaid';

/**
 * Registry of all 14 championship vehicles in OpenRally.
 */
export const VEHICLE_REGISTRY: Record<string, VehiclePreset> = {
  bmw_m3_drift: VEHICLE_BMW_M3_DRIFT,
  ...Object.fromEntries(SPEED_FLEET.map(preset => [preset.id, preset])),
  zephyr_wr4: VEHICLE_ZEPHYR_WR4,
  apex_phantom_b: VEHICLE_PHANTOM_B,
  bantam_turbo: VEHICLE_BANTAM_TURBO,
  vortex_b: VEHICLE_VORTEX_B,
  vanguard_gt: VEHICLE_VANGUARD_GT,
  shadowfire_rs: VEHICLE_SHADOWFIRE_RS,
  kodiak_raid: VEHICLE_KODIAK_RAID,
  stradale_gt: VEHICLE_STRADALE_GT,
};
// Each registered car receives a distinct immutable profile consumed by the active solver.
for (const [id,preset] of Object.entries(VEHICLE_REGISTRY)) {
  const balanced=balanceClubClass(preset);
  VEHICLE_REGISTRY[id] = {...balanced,wheelModelPath:id==='bmw_m3_drift'||SPEED_FLEET.some(car=>car.id===id)?'/models/vehicles/aero_forged_wheel.glb':preset.wheelModelPath,config:{...balanced.config,contactHandling:CONTACT_PROFILES[id]}};
}

/** Default vehicle preset ID */
export const DEFAULT_VEHICLE_ID = 'bmw_m3_drift';

/** Legacy ID fallback map for saved user settings and test continuity */
const LEGACY_VEHICLE_MAP: Record<string, string> = {
  rally_hatchback: 'zephyr_wr4',
  rally_wrc: 'shadowfire_rs',
  rally_cyclone_b: 'apex_phantom_b',
  cyclone_rs: 'apex_phantom_b',
  ignis_sprint: 'zephyr_wr4',
  rally_titan_b: 'kodiak_raid',
};

/**
 * Retrieves a vehicle preset by ID, falling back to default if not found.
 */
export function getVehiclePreset(id: string): VehiclePreset {
  const resolvedId = LEGACY_VEHICLE_MAP[id] ?? id;
  return VEHICLE_REGISTRY[resolvedId] ?? VEHICLE_REGISTRY[DEFAULT_VEHICLE_ID];
}

/**
 * Returns an array of all registered vehicle presets.
 */
export function getAvailableVehicles(): VehiclePreset[] {
  return Object.values(VEHICLE_REGISTRY);
}
