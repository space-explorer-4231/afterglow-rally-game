import {CatmullRomCurve3,Vector3} from 'three';
import {HARBOR_RING_DATA} from '@/config/levels/harborRing';
import {HARBOR_BUILDINGS,HARBOR_GARDENS,HARBOR_PARKING} from '@/config/harborScenery';

/** Physical facade layers share spatially culled material batches. */
export type HarborFinish='stucco'|'terracotta'|'ochre'|'sage'|'brick'|'cladding'|'paving'|'glass'|'stone'|'metal'|'blue'|'light'|'grass'|'asphalt'|'paint'|'sign';
/** Static architectural instance, in metres. */
export interface HarborPart {x:number;y:number;z:number;w:number;h:number;d:number;finish:HarborFinish}
/** Three architectural families preserve existing building footprints and road clearance. */
export function buildHarborArchitecture(heights:readonly number[]):HarborPart[]{
  if(heights.length!==HARBOR_BUILDINGS.length||heights.some(y=>!Number.isFinite(y)))throw new Error('Harbor requires finite building elevations.');
  const parts:HarborPart[]=[];
  const add=(finish:HarborFinish,x:number,y:number,z:number,w:number,h:number,d:number)=>parts.push({finish,x,y,z,w,h,d});
  // Connected city blocks replace the bare terrain between isolated building pads.
  const route=new CatmullRomCurve3(HARBOR_RING_DATA.track.points.map(p=>new Vector3(p.x,0,p.z)),true,'catmullrom',.5).getSpacedPoints(512);
  for(let x=-190;x<=-10;x+=12)for(let z=-140;z<=112;z+=12){
    if(route.every(p=>Math.hypot(p.x-x,p.z-z)>19))add('paving',x,8.035,z,12,.045,12);
  }
  for(const x of [-104,-48]){
    add('asphalt',x,8.067,-20,7,.025,270);
    for(let z=-145;z<116;z+=12)add('paint',x,8.085,z,.12,.012,5);
  }
  for(const z of [-65,20,108]){
    add('paving',-96,8.09,z,180,.03,7);
    for(let stripe=0;stripe<6;stripe++)for(const x of [-104,-48])add('paint',x,8.112,z-2.5+stripe,6,.014,.4);
  }
  HARBOR_BUILDINGS.forEach((b,index)=>{
    const y=heights[index],top=y+b.height,style=index%3;
    const finish:HarborFinish=index<12?(['terracotta','ochre','sage','stucco'] as const)[index%4]:style===0?'brick':style===1?'stucco':'cladding';
    add(finish,b.x,y+b.height/2,b.z,b.width,b.height,b.depth);
    add('paving',b.x,y+.10,b.z,b.width+9,.20,b.depth+9);
    add('stone',b.x,y+1.5,b.z,b.width+.16,3,b.depth+.16);
    const floors=Math.floor((b.height-3.8)/3.2);
    const columns=style===2?Math.floor(b.width/2.5):Math.floor(b.width/4);
    for(let floor=0;floor<floors;floor++){
      const fy=y+5.2+floor*3.2;
      for(const side of [-1,1]){
        for(let column=0;column<columns;column++){
          const x=b.x+(column-(columns-1)/2)*(b.width/columns);
          const zw=b.z+side*(b.depth/2+.055);
          const width=b.width/columns-(style===2?.16:.8);
          add('glass',x,fy,zw,width,style===2?2.85:1.9,.11);
          add('metal',x,fy-1.02,zw+side*.035,width+.18,.10,.20);
          add('stone',x,fy+1.02,zw+side*.02,width+.18,.12,.18);
          if(style===0 && floor%2===0 && column%2===0){
            add('stone',x,fy-1.25,zw+side*.78,width+.3,.18,1.6);
            add('glass',x,fy-.78,zw+side*1.52,width+.3,.75,.08);
            add('metal',x,fy-.38,zw+side*1.53,width+.4,.055,.12);
          }
          if(style===1){
            add('blue',x-width/2-.23,fy,zw,.24,2.05,.10);
            add('blue',x+width/2+.23,fy,zw,.24,2.05,.10);
          }
        }
        for(let column=0;column<Math.floor(b.depth/3.5);column++){
          const z=b.z+(column-(Math.floor(b.depth/3.5)-1)/2)*3.5;
          add('glass',b.x+side*(b.width/2+.06),fy,z,.12,2.0,2.65);
          add('metal',b.x+side*(b.width/2+.11),fy-1.02,z,.22,.12,2.85);
        }
      }
      // Only the stucco family has projecting cornices; towers retain crisp panel seams.
      if(style===1 || floor%3===2)add('stone',b.x,fy+1.42,b.z,b.width+.38,.16,b.depth+.38);
    }
    const roofW=b.width*.55,roofD=b.depth*.53;
    add(finish,b.x,top+1.3,b.z,roofW,2.6,roofD);
    add('metal',b.x,top+.05,b.z,b.width+.25,.10,b.depth+.25);
    // Terraced roof profile, warm parapets and deep facade bands create a coastal skyline.
    if(index>=12){
      add('cladding',b.x,top+3,b.z,b.width*.68,6,b.depth*.68);
      add('glass',b.x,top+7,b.z,b.width*.43,2,b.depth*.43);
      for(let fin=0;fin<7;fin++)add('stone',b.x-b.width/2+(fin+.5)*b.width/7,y+b.height*.55,b.z-b.depth/2-.25,.22,b.height*.8,.55);
    }
    for(const side of [-1,1]){
      add('stone',b.x+side*(b.width/2-.1),top+.48,b.z,.25,.95,b.depth);
      add('stone',b.x,top+.48,b.z+side*(b.depth/2-.1),b.width,.95,.25);
      add('blue',b.x+side*(roofW/2+.06),top+1.3,b.z,.12,2.35,roofD-.2);
    }
    add('metal',b.x-4,top+.62,b.z+3,2.7,1.15,2);
    // Near-future roof gardens, photovoltaic decks and shaded balcony bays.
    // All remain inside the existing solid building footprint and collider.
    if(index<12){
      const terraceZ=b.z+b.depth*.32;
      add('paving',b.x,top+.18,terraceZ,b.width*.76,.22,b.depth*.18);
      for(const side of [-1,1]){
        add('stone',b.x+side*b.width*.32,top+.58,terraceZ,1.1,.7,b.depth*.16);
        add('grass',b.x+side*b.width*.32,top+.95,terraceZ,1,.12,b.depth*.15);
      }
      for(let panel=0;panel<5;panel++){
        const x=b.x+(panel-2)*1.8;
        add('blue',x,top+2.68,b.z,1.65,.12,roofD*.85);
        add('metal',x,top+2.76,b.z,.035,.035,roofD*.85);
      }
      // Vertical sun fins give the silhouette depth without another material pass.
      for(let fin=0;fin<4;fin++)add('cladding',b.x+(fin-1.5)*b.width/4,y+b.height*.58,b.z-b.depth/2-.4,.16,b.height*.55,.9);
    }
    for(let vent=0;vent<5;vent++)add('stone',b.x-4,top+.3+vent*.14,b.z+4.02,2.3,.04,.04);
    // Human-scale shopfronts with shallow entrance canopy and protected planter beds.
    for(let bay=0;bay<4;bay++){
      const x=b.x+(bay-1.5)*(b.width/4);
      const z=b.z-b.depth/2-.12;
      add('glass',x,y+1.45,z,b.width/4-.36,2.55,.14);
      add('metal',x-b.width/8+.1,y+1.45,z-.04,.12,2.8,.18);
      add(bay%2===0?'blue':'ochre',x,y+3.1,z-.65,b.width/4-.12,.16,1.6);
      add(bay%2===0?'blue':'ochre',x,y+2.92,z-1.42,b.width/4-.12,.34,.06);
      add('light',x,y+2.9,z-.6,1.5,.025,.12);
    }
    add('sign',b.x,y+3.5,b.z-b.depth/2-.2,Math.min(9,b.width*.6),.7,.08);
    for(const side of [-1,1]){
      const x=b.x+side*(b.width/2+2.6),z=b.z+b.depth/2-3;
      add('stone',x,y+.43,z,1.7,.7,4.8);
      add('grass',x,y+.79,z,1.5,.025,4.6);
    }
  });
  for(const [x,z,w,d] of HARBOR_GARDENS){
    add('paving',x,8.10,z,w+1,.20,d+1);
    add('grass',x,8.22,z,w,.08,d);
    // Continuous boulevard footways, with a lower curb edge rather than isolated slabs.
    add('paving',x-10,8.10,z,4,.20,d+1);
    add('stone',x-12.05,8.16,z,.16,.32,d+1);
    // Stepping paths, pergola ribs and seating break up the former empty lawns.
    for(let bay=0;bay<5;bay++){
      const pz=z-d*.36+bay*d*.18;
      add('paving',x,8.285,pz,w*.78,.04,2.4);
      if(w>20){
        for(const side of [-1,1]){
          add('metal',x+side*4.5,10.2,pz,.14,3.9,.14);
          add('stone',x+side*3.2,8.8,pz+2.5,.5,.16,2.8);
        }
        for(let rib=0;rib<7;rib++)add('stone',x,12.22,pz-1.5+rib*.5,10,.1,.14);
      }
    }
  }
  for(const p of HARBOR_PARKING){
    // Paved pull-offs cover the planted strip while staying clear of the race route.
    add('asphalt',p.x,8.285,p.z,6.8,.04,11);
    for(const side of [-1,1]){
      add('paint',p.x+side*1.55,8.313,p.z,.10,.012,5.4);
      add('stone',p.x+side*3.48,8.34,p.z,.16,.16,11);
    }
    add('paint',p.x,8.313,p.z-2.8,3.2,.012,.10);
    // Small drain grates use real spacing, without additional textures or physics.
    add('metal',p.x+2.7,8.316,p.z-4.5,.40,.015,.75);
    for(let bar=0;bar<7;bar++)add('asphalt',p.x+2.7,8.328,p.z-4.78+bar*.09,.34,.006,.035);
  }
  for(const x of [45,-245]){
    add('paving',x,8.10,0,3,.20,290);
    add('stone',x+(x>0?-1.55:1.55),8.16,0,.16,.32,290);
  }
  for(const z of [-125,-75,-25,25,75,125])for(const x of [-103,145]){
    add('asphalt',x,8.018,z,22,.024,35);
    for(let stall=0;stall<6;stall++)add('paint',x-9+stall*3.6,8.036,z-10,.10,.014,5);
    add('paint',x,8.036,z-12.5,20,.014,.10);
  }
  return parts;
}
