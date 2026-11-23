// Reproducible CC0 vehicle adaptation. Original downloads and licenses stay in asset-sources.
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {flatten,getBounds,transformMesh,join,weld,dedup,prune,quantize,simplify} from '@gltf-transform/functions';
import {MeshoptSimplifier} from 'meshoptimizer';
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS),source='asset-sources/road-fleet-1.30/',out='public/models/vehicles/';
const specs=[
 {id:'meridian_rs',source:'voltline',front:-1,base:2.92,track:1.82,roof:.9,color:[.015,.22,.24,1],url:'https://www.innerscene.com/tools/library/3d-parts/charcoal-five-door-crossover-suv-a1996830'},
 {id:'voltline_xr',source:'voltline',front:-1,base:2.95,track:1.88,roof:1.2,color:[.12,.16,.15,1],url:'https://www.innerscene.com/tools/library/3d-parts/charcoal-five-door-crossover-suv-a1996830'},
 {id:'ironclad_sprint',source:'ironclad',front:-1,base:3.05,track:1.94,roof:1.1,color:[.42,.11,.035,1],url:'https://www.innerscene.com/tools/library/3d-parts/crew-cab-pickup-with-open-bed-4f02e0cc'},
 {id:'parcel_gt',source:'parcel',front:-1,base:3,track:1.88,roof:1.55,color:[.67,.6,.42,1],url:'https://www.innerscene.com/tools/library/3d-parts/high-roof-cargo-panel-van-c4d5145f'},
 {id:'nightfall_v8',source:'nightfall',front:1,base:2.88,track:1.86,roof:.72,color:[.06,.025,.075,1],url:'https://github.com/JaronKBragg7337/spectral-gt-rs'},
];
await MeshoptSimplifier.ready;
const manifest=[];
for(const spec of specs){
 const input=source+spec.source+'-source.glb',bytes=await fs.readFile(input),doc=await io.read(input);
 for(const animation of doc.getRoot().listAnimations())animation.dispose();
 await doc.transform(flatten());
 const nodes=doc.getRoot().listNodes(),tires=nodes.filter(n=>/Sculpted_tyre|^(Rear|Front)_(Left|Right)_Tire$/.test(n.getName()));
 if(tires.length!==4)throw Error(spec.id+': expected four identified tires, got '+tires.length);
 const centers=tires.map(n=>{const b=getBounds(n);return b.min.map((a,i)=>(a+b.max[i])/2);});
 const front=Math.max(...centers.map(p=>p[0])),rear=Math.min(...centers.map(p=>p[0]));
 const mid=(front+rear)/2,wheelY=centers.reduce((n,p)=>n+p[1],0)/4;
 const track=Math.max(...centers.map(p=>p[2]))-Math.min(...centers.map(p=>p[2]));
 const bounds=getBounds(doc.getRoot().listScenes()[0]);
 const sx=spec.track/track,sy=(spec.roof+.44)/(bounds.max[1]-wheelY),sz=spec.base/(front-rear);
 let removed=0;
 for(const node of nodes){
  const name=node.getName(),mesh=node.getMesh();if(!mesh)continue;
  if(/107 reused|brake caliper|brake rotor|ventilated brake|^(Rear|Front)_(Left|Right)_|badge|wordmark|logo/i.test(name)){node.dispose();removed++;continue;}
  transformMesh(mesh,node.getWorldMatrix());node.setMatrix([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
  // Rotate the longitudinal X axis onto game +Z, align the real axle centers, then fit the cabin.
  transformMesh(mesh,[0,0,spec.front*sz,0,0,sy,0,0,-spec.front*sx,0,0,0,0,-wheelY*sy-.44,-mid*spec.front*sz,1]);
 }
 for(const material of doc.getRoot().listMaterials()){
  if(material.getName()==='paint'||/Spectral Blue|Shadow Panels/.test(material.getName())){
   material.setName('Body_Color').setBaseColorTexture(null).setBaseColorFactor(spec.color).setMetallicFactor(.5).setRoughnessFactor(.25);
  }
  if(/glass/i.test(material.getName()))material.setRoughnessFactor(.15);
 }
 await doc.transform(weld(),dedup(),join(),prune());
 const full=await io.writeBinary(doc);await fs.writeFile(out+spec.id+'.glb',full);
 // Avoid per-car screen-space transmission passes on ordinary/mobile graphics settings.
 for(const material of doc.getRoot().listMaterials())if(/glass/i.test(material.getName())){
  material.setExtension('KHR_materials_transmission',null).setExtension('KHR_materials_ior',null);
  material.setBaseColorTexture(null).setBaseColorFactor([.045,.075,.09,1]).setMetallicFactor(.35).setRoughnessFactor(.18);
 }
 await doc.transform(simplify({simplifier:MeshoptSimplifier,ratio:.35,error:.001}),prune(),quantize({quantizePosition:16,quantizeNormal:12}));
 const output=await io.writeBinary(doc);await fs.writeFile(out+spec.id+'_opt.glb',output);
 const triangles=doc.getRoot().listMeshes().reduce((sum,m)=>sum+m.listPrimitives().reduce((n,p)=>n+(p.getIndices()?.getCount()??p.getAttribute('POSITION').getCount())/3,0),0);
 manifest.push({...spec,bytes:full.length,optimizedBytes:output.length,optimizedTriangles:triangles,removed,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),license:'CC0-1.0',bounds:getBounds(doc.getRoot().listScenes()[0])});
 console.log(spec.id,output.length,'bytes;',triangles,'triangles;',removed,'wheel/badge nodes removed');
}
await fs.writeFile(out+'speed-fleet-manifest.json',JSON.stringify(manifest,null,2));
await fs.writeFile(out+'SPEED-FLEET-LICENSE.txt','Road Fleet 1.30: crossover, touring-wagon derivative, pickup and cargo van adapted from original unbranded Innerscene models, CC0-1.0. Nightfall adapted from Spectral GT RS by JaronKBragg7337, CC0-1.0. Source URLs and SHA-256 hashes: speed-fleet-manifest.json. Adapted with wheel removal, fixed-body batching, paint changes and chassis/axle fitting. Meridian is a lowered touring-body derivative of the crossover. Shared Aero forged wheels remain original MIT project assets. BMW and Stradale retain their separate licenses.\n');
