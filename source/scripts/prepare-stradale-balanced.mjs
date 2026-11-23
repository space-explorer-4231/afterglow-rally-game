import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {prune,draco,weldPrimitive,simplifyPrimitive} from '@gltf-transform/functions';
import {MeshoptSimplifier} from 'meshoptimizer';
import draco3d from 'draco3dgltf';
import {BufferGeometry,BufferAttribute,Color} from 'three';
import {fileURLToPath} from 'node:url';
import {writeFile,stat} from 'node:fs/promises';
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'draco3d.decoder':await draco3d.createDecoderModule(),'draco3d.encoder':await draco3d.createEncoderModule(),
});
await MeshoptSimplifier.ready;
const fullFile=fileURLToPath(new URL('../public/models/vehicles/stradale-gt.glb',import.meta.url));
const full=await io.read(fullFile);
for(const material of full.getRoot().listMaterials()){
  const colors={Leather:'#243539',Leather_red:'#ab7450',Carpet:'#111c20'};
  if(colors[material.getName()]){
    const color=new Color(colors[material.getName()]);
    material.setBaseColorFactor([color.r,color.g,color.b,1]).setRoughnessFactor(0.82).setMetallicFactor(0);
  }
}
await io.write(fullFile,full);
const doc=await io.read(fullFile);
for(const mesh of doc.getRoot().listMeshes())for(const primitive of mesh.listPrimitives()){
  // Exterior and glazing remain untouched, including original livery UVs.
  if(/^(Body_Color|Glass_Gray)$/.test(primitive.getMaterial()?.getName()??''))continue;
  primitive.setAttribute('NORMAL',null).setAttribute('TANGENT',null);
  weldPrimitive(primitive);
  const name=primitive.getMaterial()?.getName()??'';
  const ratio=name.startsWith('Leather')||name==='Interior_light'?0.14:0.055;
  simplifyPrimitive(primitive,{simplifier:MeshoptSimplifier,ratio,error:0.008});
  const geometry=new BufferGeometry();
  geometry.setAttribute('position',new BufferAttribute(new Float32Array(primitive.getAttribute('POSITION').getArray()),3));
  geometry.setIndex(new BufferAttribute(new Uint32Array(primitive.getIndices().getArray()),1));
  geometry.computeVertexNormals();
  primitive.setAttribute('NORMAL',doc.createAccessor().setType('VEC3').setArray(new Float32Array(geometry.getAttribute('normal').array)));
  geometry.dispose();
}
const extras=doc.getRoot().getExtras();
doc.getRoot().setExtras({...extras,changes:String(extras.changes??'')+' Balanced cockpit refinement: retained more visible seat/trim detail within the existing mobile triangle budget, with graphite/copper leather.'});
await doc.transform(prune(),draco({quantizePosition:16,quantizeNormal:12,quantizeTexcoord:14}));
const optimizedFile=fullFile.replace('.glb','_opt.glb');
await io.write(optimizedFile,doc);
let triangles=0;
for(const mesh of doc.getRoot().listMeshes())for(const primitive of mesh.listPrimitives())triangles+=primitive.getIndices().getCount()/3;
const bytes=(await stat(optimizedFile)).size;
if(bytes>700000||triangles>=100000)throw Error('Balanced car exceeds its geometry/download budget');
await writeFile(fileURLToPath(new URL('../../research/graphics-1.12/balanced-car.json',import.meta.url)),JSON.stringify({triangles,bytes,protectedMaterials:['Body_Color','Glass_Gray'],visibleCockpitRatio:0.14,otherTrimRatio:0.055,maxError:0.008},null,2));
console.log('Balanced Stradale:',triangles,'triangles,',bytes,'bytes');
