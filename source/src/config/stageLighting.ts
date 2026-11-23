import {LIGHTING_CONFIG} from './environment';

/** Analytic light balance complements the existing HDR image-based lighting. */
export interface StageLightingProfile{
  ambientIntensity:number;hemisphereIntensity:number;directionalIntensity:number;
  ambientColor:string;sunColor:string;skyColor:string;groundColor:string;
}
const BASE_DESKTOP:StageLightingProfile={ambientIntensity:LIGHTING_CONFIG.ambient.intensity,
  hemisphereIntensity:LIGHTING_CONFIG.hemisphere.intensity,directionalIntensity:LIGHTING_CONFIG.directional.intensity,
  ambientColor:LIGHTING_CONFIG.ambient.color,sunColor:LIGHTING_CONFIG.directional.color,
  skyColor:LIGHTING_CONFIG.hemisphere.skyColor,groundColor:LIGHTING_CONFIG.hemisphere.groundColor};
const BASE_MOBILE:StageLightingProfile={...BASE_DESKTOP,ambientIntensity:.72,hemisphereIntensity:.85,
  directionalIntensity:1.45,skyColor:'#a2cbfa',groundColor:'#4e6244'};
const COASTAL_DESKTOP:StageLightingProfile={ambientIntensity:.20,hemisphereIntensity:.42,directionalIntensity:3.1,
  ambientColor:'#b8cfe3',sunColor:'#fff0d9',skyColor:'#adc6df',groundColor:'#565645'};
const COASTAL_MOBILE:StageLightingProfile={...COASTAL_DESKTOP,ambientIntensity:.55,hemisphereIntensity:.7,directionalIntensity:1.95};

const STAGE_DESKTOP:Readonly<Record<string,StageLightingProfile>>={
  level1_island:{...BASE_DESKTOP,ambientIntensity:.22,directionalIntensity:2.5,groundColor:'#536247'},
  level2_desert:{...BASE_DESKTOP,ambientIntensity:.18,directionalIntensity:2.9,sunColor:'#fff2df',skyColor:'#bacbde',groundColor:'#9b7954'},
  level3_sweden:{...BASE_DESKTOP,ambientIntensity:.26,directionalIntensity:2.35,sunColor:'#fff8ef',skyColor:'#b9cfeb',groundColor:'#b9c9d6',hemisphereIntensity:.6},
  level4_britain:{...BASE_DESKTOP,ambientIntensity:.24,directionalIntensity:1.85,sunColor:'#fff5e9',skyColor:'#b2c2d1',groundColor:'#4e594a',hemisphereIntensity:.55},
  level5_gymkhana:{...BASE_DESKTOP,ambientIntensity:.2,directionalIntensity:2.6,groundColor:'#60645a'},
};
// Mobile keeps each biome's color and sun relationship instead of using one flat fill.
const STAGE_MOBILE:Readonly<Record<string,StageLightingProfile>>=Object.fromEntries(Object.entries(STAGE_DESKTOP).map(([id,profile])=>[id,{
  ...profile,ambientIntensity:profile.ambientIntensity+.22,hemisphereIntensity:Math.min(.85,profile.hemisphereIntensity+.22),directionalIntensity:profile.directionalIntensity*.74,
}]));
/** Reused immutable profile selection; other stages retain their existing light balance. */
export function getStageLighting(levelId:string,mobile:boolean):Readonly<StageLightingProfile>{
  if(levelId==='level6_gymkhana_harbor')return mobile?COASTAL_MOBILE:COASTAL_DESKTOP;
  return mobile?(STAGE_MOBILE[levelId]??BASE_MOBILE):(STAGE_DESKTOP[levelId]??BASE_DESKTOP);
}
