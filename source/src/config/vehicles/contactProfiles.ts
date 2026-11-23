import type { VehicleConfig } from '@/types/vehicle';
export type ContactProfile = NonNullable<VehicleConfig['contactHandling']>;
export const DEFAULT_CONTACT_PROFILE: ContactProfile = {frontGrip:1,rearGrip:1,steeringLock:.54,steeringResponse:8,brakeStrength:1,countersteer:1.5,driftRearGrip:1,stability:1};
/** Explicit live-solver roles. Higher speed is paid for with weight, braking or agility. */
export const CONTACT_PROFILES: Readonly<Record<string, ContactProfile>> = {
  meridian_rs:{frontGrip:1.02,rearGrip:1.04,steeringLock:.51,steeringResponse:7.4,brakeStrength:.94,countersteer:1.4,driftRearGrip:.95,stability:1.05},
  voltline_xr:{frontGrip:1.04,rearGrip:1.06,steeringLock:.54,steeringResponse:8.1,brakeStrength:1,countersteer:1.35,driftRearGrip:.93,stability:1.1},
  ironclad_sprint:{frontGrip:1.04,rearGrip:1.04,steeringLock:.55,steeringResponse:8.4,brakeStrength:1,countersteer:1.4,driftRearGrip:.9,stability:1.05},
  parcel_gt:{frontGrip:1.03,rearGrip:1.05,steeringLock:.54,steeringResponse:8,brakeStrength:.99,countersteer:1.35,driftRearGrip:.94,stability:1.12},
  nightfall_v8:{frontGrip:1.08,rearGrip:1.02,steeringLock:.58,steeringResponse:9,brakeStrength:1.04,countersteer:1.4,driftRearGrip:.86,stability:1.12},
  bmw_m3_drift:{frontGrip:1.16,rearGrip:1,steeringLock:.82,steeringResponse:11,brakeStrength:1.08,countersteer:1.25,driftRearGrip:.65,stability:1.15},
  zephyr_wr4:{...DEFAULT_CONTACT_PROFILE,frontGrip:1.03,rearGrip:1.03},
  bantam_turbo:{...DEFAULT_CONTACT_PROFILE,steeringResponse:9.2,steeringLock:.58,brakeStrength:.96},
  apex_phantom_b:{...DEFAULT_CONTACT_PROFILE,frontGrip:1.05,rearGrip:.97,steeringResponse:8.8},
  vortex_b:{...DEFAULT_CONTACT_PROFILE,frontGrip:.98,rearGrip:.94,stability:.94},
  vanguard_gt:{...DEFAULT_CONTACT_PROFILE,frontGrip:1.08,rearGrip:1.08,steeringLock:.5,brakeStrength:1.05},
  shadowfire_rs:{...DEFAULT_CONTACT_PROFILE,frontGrip:1.04,rearGrip:.98,steeringResponse:8.7},
  kodiak_raid:{...DEFAULT_CONTACT_PROFILE,steeringResponse:8,steeringLock:.54,brakeStrength:1,frontGrip:1.04,rearGrip:1.06},
  stradale_gt:{...DEFAULT_CONTACT_PROFILE,frontGrip:1.12,rearGrip:1.12,brakeStrength:1.12,steeringLock:.51},
};
