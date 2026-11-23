// Original fleet meshes. The separately licensed BMW is adapted by adapt-bmw-drift.py.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {BoxGeometry,BufferGeometry,Float32BufferAttribute,CylinderGeometry,TorusGeometry,ExtrudeGeometry,Shape,Group,Mesh,MeshStandardMaterial,MeshPhysicalMaterial,DoubleSide,Vector3} from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {NodeIO} from '@gltf-transform/core';
import {weld,dedup,prune,simplify,quantize} from '@gltf-transform/functions';
import {MeshoptSimplifier} from 'meshoptimizer';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
globalThis.FileReader=class{readAsArrayBuffer(b){b.arrayBuffer().then(r=>{this.result=r;this.onloadend?.();});}readAsDataURL(b){b.arrayBuffer().then(r=>{this.result=`data:${b.type};base64,${Buffer.from(r).toString('base64')}`;this.onloadend?.();});}};
const out=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../public/models/vehicles');
const fleet=[
 {id:'meridian_rs',type:'wagon',w:1.96,l:4.7,roof:.9,rear:-1.85,front:.8,color:'#087b83',base:2.92,radius:.34},
 {id:'voltline_xr',type:'suv',w:2.02,l:4.65,roof:1.02,rear:-1.55,front:1.05,color:'#c9d7ce',base:2.95,radius:.36},
 {id:'ironclad_sprint',type:'pickup',w:2.08,l:4.95,roof:1.1,rear:-.25,front:1.05,color:'#bd5529',base:3.05,radius:.38},
 {id:'parcel_gt',type:'van',w:2.02,l:4.85,roof:1.35,rear:-2.05,front:1.35,color:'#e8dfb8',base:3,radius:.36},
 {id:'nightfall_v8',type:'muscle',w:2,l:4.75,roof:.72,rear:-.95,front:.6,color:'#352841',base:2.88,radius:.34},
];
function material(name,color,roughness=.4,metalness=0){return new MeshStandardMaterial({name,color,roughness,metalness});}
const rubber=material('Rubber','#14191d',.82),carbon=material('Carbon_Trim','#192126',.35,.25),metal=material('Machined_Alloy','#afb5bf',.22,.85),blue=material('Aero_Blue','#176d9d',.3,.2),darkblue=material('Aero_Navy','#183446',.32,.2);
function smooth(a,b,t){const v=Math.max(0,Math.min(1,t));return a+(b-a)*v*v*(3-2*v);}
function build(spec){
 const root=new Group();root.name=spec.id;
 const paint=new MeshPhysicalMaterial({name:'Body_Color',color:spec.color,roughness:.24,metalness:.48,clearcoat:1,clearcoatRoughness:.12}),glass=new MeshPhysicalMaterial({name:'Smoked_Glass',color:'#06131c',roughness:.28,metalness:0,clearcoat:.3,clearcoatRoughness:.18,side:DoubleSide});
 const lamp=material('Headlight_Lens','#daeaff',.12,.25);lamp.emissive.set('#c2e9ff');lamp.emissiveIntensity=.35;
 const red=material('Taillight_Lens','#a41025',.15,.25);red.emissive.set('#690011');red.emissiveIntensity=.3;
 const add=(g,m,x=0,y=0,z=0,rot=[0,0,0])=>{const mesh=new Mesh(g,m);mesh.position.set(x,y,z);mesh.rotation.set(...rot);root.add(mesh);return mesh;};
 function roundBox(w,h,d,m,x=0,y=0,z=0,r=.035){
  r=Math.min(r,w/3,h/3,d/3);const sh=new Shape();sh.moveTo(-w/2+r,-h/2);sh.lineTo(w/2-r,-h/2);sh.quadraticCurveTo(w/2,-h/2,w/2,-h/2+r);sh.lineTo(w/2,h/2-r);sh.quadraticCurveTo(w/2,h/2,w/2-r,h/2);sh.lineTo(-w/2+r,h/2);sh.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r);sh.lineTo(-w/2,-h/2+r);sh.quadraticCurveTo(-w/2,-h/2,-w/2+r,-h/2);
  const g=new ExtrudeGeometry(sh,{depth:d-2*r,steps:1,bevelEnabled:true,bevelSize:r*.45,bevelThickness:r,bevelSegments:3,curveSegments:8});g.translate(0,0,-d/2+r);return add(g,m,x,y,z);
 }
 function surface(grid,material){const vertices=[],indices=[];for(const row of grid)for(const p of row)vertices.push(...p);const columns=grid[0].length;for(let j=0;j<grid.length-1;j++)for(let i=0;i<columns-1;i++){const a=j*columns+i;indices.push(a,a+columns,a+1,a+1,a+columns,a+columns+1);}const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(vertices,3));g.setAttribute('uv',new Float32BufferAttribute(Array(vertices.length/3*2).fill(0),2));g.setIndex(indices);g.computeVertexNormals();add(g,material);}
 function rail(a,b,r,m){const start=new Vector3(...a),end=new Vector3(...b),direction=end.clone().sub(start);const mesh=add(new CylinderGeometry(r,r,direction.length(),12),m,...start.add(end).multiplyScalar(.5).toArray());mesh.quaternion.setFromUnitVectors(new Vector3(0,1,0),direction.normalize());}

 const half=spec.l/2,axle=spec.base/2,rows=[];
 const rear=spec.rear,front=spec.front,roof=spec.roof,rw=spec.w*(spec.type==='muscle'?.325:.35),lowW=spec.w*.425;
 const rearSweep=spec.type==='pickup'?.25:spec.type==='muscle'?.52:.43;
 const frontSweep=spec.type==='van'?.48:spec.type==='suv'?.66:.76;
 const topRear=rear+rearSweep,topFront=front-frontSweep;
 // Seventeen longitudinal shoulder strips form a continuous crowned, tapered shell.
 for(let i=0;i<=192;i++){
  const z=-half+spec.l*i/192,end=Math.max(0,(Math.abs(z)-(half-.62))/.62);
  const wheelBulge=.035*Math.exp(-(((Math.abs(z)-axle)/.5)**2));
  const w=spec.w/2*(1-.23*end*end)+wheelBulge;
  const hood=(spec.type==='pickup'&&z<rear-.15?.16:.43)-.15*end*end+.025*Math.cos(z*1.5);
  const dz=Math.min(Math.abs(z-axle),Math.abs(z+axle));
  const bottom=dz<spec.radius+.13?Math.max(-.2,-.48+Math.sqrt((spec.radius+.13)**2-dz*dz)):-.2;
  const row=[[-w,bottom,z],[-w,.17-.03*end,z]];
  for(let k=0;k<=16;k++){const u=-1+k/8;row.push([w*u,hood-.12*Math.pow(Math.abs(u),3),z]);}
  row.push([w,.17-.03*end,z],[w,bottom,z]);rows.push(row);
 }
 surface(rows,paint);
 for(const end of [-1,1])roundBox(spec.w*.78,.28,.14,paint,0,.045,end*(half-.02),.055);
 roundBox(spec.w*.86,.04,spec.l*.52,carbon,0,-.2,0,.012);
 const roofRows=[];
 for(let j=0;j<=30;j++){const t=j/30,z=topRear+(topFront-topRear)*t,row=[];
  const crown=.035*Math.sin(Math.PI*t),width=rw*(.94+.06*Math.sin(Math.PI*t));
  for(let k=0;k<=24;k++){const u=-1+k/12;row.push([width*u,roof+crown+.045*(1-u*u),z]);}roofRows.push(row);}
 surface(roofRows,paint);
 // Sloped panoramic windshield and rear glazing join the bowed roof with substantial rake.
 for(const [end,z0,z1] of [[1,topFront,front],[-1,topRear,rear]]){
  const grid=[];for(let j=0;j<=16;j++){const v=j/16,row=[];for(let k=0;k<=24;k++){
   const u=-1+k/12;row.push([(lowW-.05+(rw*.94-lowW+.05)*v)*u,.448+(roof-.46)*v+.035*(1-u*u),z1+(z0-z1)*v]);
  }grid.push(row);}surface(end>0?grid.toReversed():grid,glass);
 }
 for(const side of [-1,1]){
  const grid=[];for(let j=0;j<=36;j++){const t=j/36,row=[];
   for(let k=0;k<=10;k++){const v=k/10,z=rear+.045+(front-rear-.09)*t+v*(rearSweep*(1-t)-frontSweep*t);
    const x=lowW+(rw*(.94+.06*Math.sin(Math.PI*t))-lowW)*v;
    row.push([side*x,.425+(roof-.425)*v+.015*Math.sin(Math.PI*v),z]);}grid.push(row);}
  surface(side>0?grid.map(r=>r.toReversed()):grid,glass);
  rail([side*lowW,.42,rear+.045],[side*rw*.94,roof,topRear],.043,paint);
  rail([side*lowW,.42,front-.045],[side*rw*.94,roof,topFront],.045,paint);
  rail([side*rw*.94,roof,topRear],[side*rw*.94,roof,topFront],.023,paint);
  rail([side*lowW,.426,rear+.045],[side*lowW,.426,front-.045],.018,metal);
  const divider=spec.type==='muscle'?.01:(rear+front)*.35;
  rail([side*lowW,.435,divider],[side*rw,roof,divider-.08],.029,carbon);
  if(spec.type==='wagon'||spec.type==='suv')rail([side*lowW,.435,rear+.55],[side*rw,roof,rear+.72],.023,paint);
  for(const z of spec.type==='muscle'?[.1]:[.26,-.82])roundBox(.04,.027,.17,metal,side*(spec.w/2+.012),.19,z,.008);
  roundBox(.04,.055,spec.l-.55,carbon,side*(spec.w/2),-.145,0,.012);
  for(const z of spec.type==='pickup'?[rear+.04,front-.08]:spec.type==='muscle'?[rear+.08,front-.08]:[rear+.08,(rear+front)/2,front-.08])rail([side*(spec.w/2+.008),-.105,z],[side*(spec.w/2+.008),.26,z],.003,carbon);
  const mirror=roundBox(.19,.09,.26,paint,side*(spec.w/2+.08),.42,front-.13,.034);mirror.rotation.y=side*.2;
  roundBox(.012,.06,.18,glass,side*(spec.w/2+.185),.423,front-.16,.006);
  // Recessed fender blades and a lower rocker crease break up large flat side panels.
  roundBox(.022,.065,.3,carbon,side*(spec.w/2+.014),.16,axle-.52,.014);
  rail([side*(spec.w/2+.01),.08,-axle+.48],[side*(spec.w/2+.01),.14,axle-.48],.006,metal);
 }
 if(spec.type==='van'){
  // Plain cargo panels replace rear glazing. A recessed lower sill and sliding-door seams define the van.
  for(const side of [-1,1]){roundBox(.055,roof-.48,1.8,paint,side*(spec.w*.405),(.45+roof)/2,-.92,.012);roundBox(.064,.015,1.75,carbon,side*(spec.w*.41),.5,-.9,.004);}
 }
 if(spec.type==='pickup'){
  roundBox(spec.w*.81,.04,1.9,carbon,0,.31,-1.3,.01);
  for(const side of [-1,1])roundBox(.14,.18,1.9,paint,side*(spec.w*.43),.38,-1.3,.025);
  for(let i=0;i<8;i++)roundBox(.018,.022,1.7,metal,(i-3.5)*.18,.34,-1.3,.005);
  roundBox(spec.w*.84,.06,.13,carbon,0,.47,-half+.06,.012);
 }
 // Split intakes, side cooling ducts, front splitter and rear diffuser.
 roundBox(spec.w*.49,.16,.04,carbon,0,.015,half+.06,.017);
 for(const side of [-1,1])roundBox(.29,.14,.05,carbon,side*spec.w*.32,.025,half+.075,.025);
 roundBox(spec.w*.98,.038,.25,carbon,0,-.145,half-.045,.012);
 roundBox(spec.w*.9,.12,.15,carbon,0,-.1,-half-.03,.012);
 for(let i=-3;i<=3;i++)roundBox(.012,.1,.27,carbon,i*.18,-.13,-half+.015,.003);
 for(const side of [-1,1]){
  roundBox(.49,.13,.06,carbon,side*spec.w*.32,.245,half+.03,.027);
  if(spec.type==='muscle'){
   for(const offset of [-.12,.12]){add(new CylinderGeometry(.047,.047,.018,32),lamp,side*spec.w*.32+offset,.245,half+.07,[Math.PI/2,0,0]);add(new TorusGeometry(.053,.006,6,32),metal,side*spec.w*.32+offset,.245,half+.083);}
  }else{
   roundBox(.43,.022,.012,lamp,side*spec.w*.32,.279,half+.067,.007);
   for(const offset of [-.125,0,.125])roundBox(.065,.05,.014,lamp,side*spec.w*.32+offset,.235,half+.069,.014);
  }
  roundBox(.47,.078,.05,red,side*spec.w*.3,.21,-half-.065,.025);
  roundBox(.4,.012,.062,red,side*spec.w*.3,.305,-half-.066,.005);
  for(const n of [-1,1])add(new CylinderGeometry(.041,.041,.11,20),metal,side*.58+n*.045,-.125,-half-.11,[Math.PI/2,0,0]);
 }
 for(let i=0;i<5;i++)roundBox(spec.w*.465,.008,.016,metal,0,-.047+i*.03,half+.084,.003);
 // Arch lips end at the sill rather than hanging below the coachwork.
 for(const side of [-1,1])for(const z of [-axle,axle]){const radius=spec.radius+.125,start=Math.asin(.29/radius);const ring=new TorusGeometry(radius,.032,8,64,Math.PI-2*start);ring.rotateZ(start);ring.rotateY(Math.PI/2);add(ring,paint,side*spec.w/2,-.48,z);}
 if(spec.type==='bmw'){
  for(const side of [-1,1]){
   roundBox(.29,.22,.07,metal,side*.17,.24,half+.075,.055);roundBox(.245,.174,.074,carbon,side*.17,.24,half+.09,.035);
   for(let i=0;i<7;i++)roundBox(.012,.145,.013,metal,side*.17+(i-3)*.032,.24,half+.135,.004);
   for(const offset of [-.115,.115]){add(new TorusGeometry(.061,.007,6,40),lamp,side*.67+offset,.26,half+.074);add(new CylinderGeometry(.046,.046,.035,24),glass,side*.67+offset,.26,half+.06,[Math.PI/2,0,0]);}
   roundBox(.06,.04,.29,metal,side*(spec.w/2+.01),.215,.95,.008);
   roundBox(.075,.008,1.15,blue,side*.24,.439,1.15,.004);
   roundBox(.055,.009,1.15,darkblue,side*.34,.44,1.15,.004);
   roundBox(.025,.33,1.15,blue,side*(spec.w/2+.026),.05,0,.005);
   for(let k=0;k<6;k++)roundBox(.045,.06,.015,metal,side*(spec.w/2+.014),.04,-.5+k*.14,.005);
  }
  // Drift aero: sculpted hood vent, pedestal wing and exposed side cooling detail.
  roundBox(.44,.026,.22,carbon,0,.443,1.34,.02);
  for(let i=0;i<6;i++)roundBox(.4,.009,.012,metal,0,.458,1.25+i*.031,.003);
  for(const side of [-1,1])roundBox(.05,.25,.1,carbon,side*.6,.46,-1.89,.015);
  roundBox(1.79,.045,.28,carbon,0,.59,-1.92,.012);
  for(const side of [-1,1])roundBox(.025,.16,.3,blue,side*.9,.6,-1.92,.008);
 }else if(spec.type==='muscle'){
  for(const side of [-1,1])roundBox(.17,.01,1.3,carbon,side*.21,.44,1.06,.003);
  roundBox(.46,.13,.43,paint,0,.47,1.07,.04);roundBox(.38,.07,.018,carbon,0,.47,1.3,.012);
  roundBox(1.75,.04,.16,carbon,0,.46,-half+.05,.01);
 }else if(spec.type==='suv'){
  roundBox(spec.w*.72,.02,.06,lamp,0,.29,half+.06,.006);
  for(const side of [-1,1])roundBox(.035,.055,1.9,metal,side*.63,roof+.045,-.32,.01);
 }else if(spec.type==='wagon'){
  for(const side of [-1,1])roundBox(.035,.046,2.1,metal,side*.62,roof+.05,-.65,.009);
  roundBox(1.55,.045,.18,carbon,0,roof+.06,rear+.15,.012);
 }
 return batch(root);
}
function batch(root){root.updateMatrixWorld(true);const batches=new Map();for(const m of root.children){const g=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone();g.applyMatrix4(m.matrixWorld);const list=batches.get(m.material)??[];list.push(g);batches.set(m.material,list);m.geometry.dispose();}const result=new Group();result.name=root.name;for(const [mat,list]of batches){const g=mergeGeometries(list,false);if(!g)throw Error('Mesh batching failed');result.add(new Mesh(g,mat));list.forEach(g=>g.dispose());}return result;}
function wheel(){const root=new Group();root.name='Aero_Forged_Wheel';const add=(g,m,x=0,y=0,z=0,rot=[0,0,0])=>{const mesh=new Mesh(g,m);mesh.position.set(x,y,z);mesh.rotation.set(...rot);root.add(mesh);};
 add(new CylinderGeometry(.34,.34,.245,64,1,true),rubber,0,0,0,[0,0,Math.PI/2]);
 for(const x of [-.105,.105]){add(new TorusGeometry(.29,.05,8,64),rubber,x,0,0,[0,Math.PI/2,0]);add(new TorusGeometry(.242,.016,8,64),metal,x,0,0,[0,Math.PI/2,0]);}
 add(new CylinderGeometry(.22,.22,.012,64),carbon,.086,0,0,[0,0,Math.PI/2]);
 add(new CylinderGeometry(.065,.065,.05,32),metal,.12,0,0,[0,0,Math.PI/2]);
 for(let i=0;i<10;i++){const a=i*Math.PI/5;add(new BoxGeometry(.035,.027,.19),metal,.117,Math.sin(a)*.139,Math.cos(a)*.139,[a,0,0]);}
 for(let i=0;i<5;i++){const a=i*Math.PI/2.5;add(new CylinderGeometry(.009,.009,.014,10),darkblue,.151,Math.sin(a)*.039,Math.cos(a)*.039,[0,0,Math.PI/2]);}
 // Tread blocks, not a smooth cylinder. Shared and merged into two material batches.
 for(let i=0;i<64;i++){const a=i*Math.PI/32;add(new BoxGeometry(.18,.009,.026),rubber,0,Math.sin(a)*.339,Math.cos(a)*.339,[-a,0,0]);}
 return batch(root);
}
await fs.mkdir(out,{recursive:true});const exporter=new GLTFExporter(),manifest=[];
async function save(scene,target){const io=new NodeIO().registerExtensions(ALL_EXTENSIONS),raw=await exporter.parseAsync(scene,{binary:true}),document=await io.readBinary(new Uint8Array(raw));await document.transform(weld(),dedup(),prune());const data=await io.writeBinary(document);await fs.writeFile(target,data);return data.byteLength;}
const nightfallOnly = process.argv.includes('--nightfall-coupe');
for(const spec of nightfallOnly ? fleet.filter(spec => spec.id === 'nightfall_v8') : process.argv.includes('--legacy-coachwork')?fleet:[]){
 const scene=build(spec),bytes=await save(scene,path.join(out,spec.id+'.glb'));
 let optimizedBytes=bytes;
 if(nightfallOnly){
  const io=new NodeIO().registerExtensions(ALL_EXTENSIONS),document=await io.read(path.join(out,spec.id+'.glb'));
  // This original coupe uses solid PBR materials, so its all-zero authoring UVs
  // carry no visual information and need not ship in the mobile mesh.
  for(const mesh of document.getRoot().listMeshes())for(const primitive of mesh.listPrimitives())primitive.setAttribute('TEXCOORD_0',null);
  await MeshoptSimplifier.ready;
  await document.transform(simplify({simplifier:MeshoptSimplifier,ratio:.35,error:.002}),prune(),quantize({quantizePosition:16,quantizeNormal:12}));
  const optimized=await io.writeBinary(document);optimizedBytes=optimized.byteLength;
  await fs.writeFile(path.join(out,spec.id+'_opt.glb'),optimized);
 }
 manifest.push({...spec,bytes,optimizedBytes,meshCount:scene.children.length});console.log(spec.id,bytes,optimizedBytes,scene.children.length);
}
if(!nightfallOnly)await save(wheel(),path.join(out,'aero_forged_wheel.glb'));
if(nightfallOnly){
 const file=path.join(out,'speed-fleet-manifest.json'),existing=JSON.parse(await fs.readFile(file,'utf8'));
 const generated=manifest[0];
 await fs.writeFile(file,JSON.stringify(existing.map(entry=>entry.id==='nightfall_v8'?{id:entry.id,source:'Aeroline original closed coupe coachwork',generator:'scripts/build-aero-coachwork.mjs --nightfall-coupe',license:'MIT',bytes:generated.bytes,optimizedBytes:generated.optimizedBytes,meshCount:generated.meshCount}:entry),null,2)+'\n');
}
if(process.argv.includes('--legacy-coachwork'))await fs.writeFile(path.join(out,'speed-fleet-manifest.json'),JSON.stringify(manifest,null,2));
if(process.argv.includes('--legacy-coachwork'))await fs.writeFile(path.join(out,'SPEED-FLEET-LICENSE.txt'),'Aeroline original sculpted Speed Fleet coachwork and forged wheel meshes, 2026. MIT license. Rebuild: scripts/build-aero-coachwork.mjs. The separate BMW model is attributed under CC BY 4.0 in BMW-M3-LICENSE.txt.\n');

