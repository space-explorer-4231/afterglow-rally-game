import type {LevelData,LevelPreset,PropData} from '@/types/level';
import {LEVEL5_GYMKHANA_DATA} from './gymkhanaIsland';

const props:PropData[]=[];
// Reuse the outer hills and licensed vegetation, keeping the new street loop clear.
props.push(...LEVEL5_GYMKHANA_DATA.props.filter(p=>p.id.startsWith('district_grove')));
export const HARBOR_RING_DATA:LevelData={
  ...LEVEL5_GYMKHANA_DATA,id:'level6_gymkhana_harbor',name:'Harbor Ring',props,
  track:{width:14,falloff:8,targetHeight:8,points:[
    {x:20,z:-130},{x:20,z:-20},{x:20,z:155},{x:-70,z:215},
    {x:-210,z:150},{x:-220,z:-100},{x:-155,z:-180},{x:-35,z:-180},
  ]},
};
/** A separate street circuit; the original district and rally stages remain available. */
export const LEVEL_PRESET_HARBOR:LevelPreset={
  id:HARBOR_RING_DATA.id,name:'Harbor Ring',
  description:'A coastal street loop past planted boulevards, colorful roadsters and layered storefronts in warm afternoon light. Cruise freely or practice both drift directions.',
  difficulty:'easy',surfaceDescription:'Asphalt streets',recommendedTire:'asphalt',
  supportedModes:['freeroam','timeattack'],bannerUrl:'/images/stages/harbor-ring.webp',
  data:HARBOR_RING_DATA,spawnPosition:[20,9.5,-100],spawnRotationY:0,fallResetY:-10,
  environment:{hasWater:true,
    sky:{sunPosition:[-110,31,60],turbidity:3,rayleigh:1.3,mieCoefficient:0.005,mieDirectionalG:0.8},
    fog:{color:'#d7d5c8',near:180,far:1400},
  },
};
