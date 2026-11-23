import type {GraphicsQuality} from '@/types/game';

/** Curated photographed assets; CC0 authors and source hashes are preserved in asset credits. */
export const COASTAL_ASSETS=['island_tree_02','shrub_01','painted_wooden_bench','street_lamp_01','utility_box_02'] as const;
export type CoastalAsset=typeof COASTAL_ASSETS[number];
/** Grounded prop transform and approximate horizontal clearance radius. */
export interface CoastalPlacement {asset:CoastalAsset;x:number;z:number;y:number;scale:number;yaw:number;radius:number}
/** Static decorative layout, outside race corridors and the recovery grid. */
export function createCoastalPlacements():CoastalPlacement[]{
  const placements:CoastalPlacement[]=[];
  for(const x of [75,-280])for(let i=0;i<12;i++){
    const z=-105+i*20;
    placements.push({asset:'island_tree_02',x,z,y:8.24,scale:1.4+(i%3)*.07,yaw:i*2.39996,radius:5});
    placements.push({asset:'shrub_01',x:x-4,z:z+7,y:8.24,scale:.75,yaw:i*1.7,radius:1.5});
    if(i%2===0)placements.push({asset:'painted_wooden_bench',x:x-9,z:z+5,y:8.21,scale:1,yaw:Math.PI/2,radius:1.5});
  }
  // A second planted row frames the boulevard; small trees occupy the urban courtyards.
  for(const x of [55,-266])for(let i=0;i<6;i++)placements.push({asset:'island_tree_02',x,z:-90+i*36,y:8.24,scale:.9,yaw:i*2.4,radius:3.5});
  for(const x of [45,-245])for(const z of [-125,-75,-25,25,75,125]){
    placements.push({asset:'street_lamp_01',x,z,y:8.21,scale:1,yaw:x>0?-Math.PI/2:Math.PI/2,radius:.8});
    if(z===-125||z===25)placements.push({asset:'utility_box_02',x:x+(x>0?2:-2),z:z+7,y:8.20,scale:1,yaw:Math.PI/2,radius:.7});
  }
  return placements;
}
/** Bounds expensive near-field meshes and reduces mobile texture memory. */
export function coastalViewDistance(quality:GraphicsQuality,mobile:boolean,asset:CoastalAsset):number{
  if(asset==='island_tree_02')return mobile||quality==='low'?30:quality==='medium'?45:75;
  return mobile||quality==='low'?100:quality==='medium'?180:300;
}
