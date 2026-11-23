/** A measured lightweight parked derivative of the existing credited Aero S1. */
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {mergeDocuments,getBounds,flatten,join,dedup,weld,simplify,prune,center,meshopt} from '@gltf-transform/functions';
import {MeshoptSimplifier,MeshoptEncoder,MeshoptDecoder} from 'meshoptimizer';
import draco3d from 'draco3dgltf';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const game=path.resolve(import.meta.dirname,'../..');
await Promise.all([MeshoptSimplifier.ready,MeshoptEncoder.ready,MeshoptDecoder.ready]);
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'draco3d.decoder':await draco3d.createDecoderModule(),
  'meshopt.encoder':MeshoptEncoder,'meshopt.decoder':MeshoptDecoder,
});
const sourceBody=path.join(game,'OpenRally/public/models/vehicles/stradale-gt_opt.glb');
const sourceWheels=path.join(game,'OpenRally/public/models/vehicles/stradale-gt-wheel.glb');
const doc=await io.read(sourceBody),wheelDoc=await io.read(sourceWheels);
for(const asset of [doc,wheelDoc])for(const extension of asset.getRoot().listExtensionsUsed())
  if(extension.extensionName==='KHR_draco_mesh_compression')extension.dispose();
const scene=doc.getRoot().listScenes()[0];
const body=doc.createNode('Parked body').setTranslation([0,-.878,0]).setRotation([0,1,0,0]);
for(const node of [...scene.listChildren()])body.addChild(node);
scene.addChild(body);
const wheelBounds=getBounds(wheelDoc.getRoot().listScenes()[0]);
const centerPoint=wheelBounds.min.map((n,i)=>(n+wheelBounds.max[i])/2);
const scale=.35/(Math.max(wheelBounds.max[1]-wheelBounds.min[1],wheelBounds.max[2]-wheelBounds.min[2])/2);
const imported=mergeDocuments(doc,wheelDoc);
const importedScene=imported.get(wheelDoc.getRoot().listScenes()[0]);
function cloneHierarchy(node){
  if(node.getSkin())throw Error('Parked wheel unexpectedly contains a skin');
  const clone=doc.createNode(node.getName()).setTranslation(node.getTranslation())
    .setRotation(node.getRotation()).setScale(node.getScale()).setMesh(node.getMesh());
  for(const child of node.listChildren())clone.addChild(cloneHierarchy(child));
  return clone;
}
const hubs=[[-.835,-.42,1.155],[.835,-.42,1.155],[-.835,-.42,-1.495],[.835,-.42,-1.495]];
for(const [i,hub] of hubs.entries()){
  const right=hub[0]>0,side=right?1:-1;
  const fitted=doc.createNode('Parked wheel '+i).setTranslation([
    hub[0]-centerPoint[0]*scale*side,hub[1]-centerPoint[1]*scale,hub[2]-centerPoint[2]*scale*side,
  ]).setRotation(right?[0,0,0,1]:[0,1,0,0]).setScale([scale,scale,scale]);
  for(const node of importedScene.listChildren())fitted.addChild(cloneHierarchy(node));
  scene.addChild(fitted);
}
importedScene.dispose();
const interior=/^(Leather.*|Interior_light|Carpet)$/;
const trim=doc.createMaterial('Parked_Trim').setBaseColorFactor([.22,.27,.31,1]).setMetallicFactor(.7).setRoughnessFactor(.32);
for(const mesh of doc.getRoot().listMeshes())for(const primitive of [...mesh.listPrimitives()]){
  const material=primitive.getMaterial(),name=material?.getName()??'';
  if(interior.test(name)){mesh.removePrimitive(primitive);continue;}
  if(name==='Glass_Gray')material.setAlphaMode('OPAQUE').setBaseColorFactor([.024,.041,.065,1]).setRoughnessFactor(.14).setMetallicFactor(.35);
  else if(!/^(Body_Color|Tires|_0098_DodgerBlue|Taillight_Glass|Projector_Glass|Turn_Signal_LED)$/.test(name))primitive.setMaterial(trim);
}
await doc.transform(prune(),dedup(),flatten(),join({keepNamed:false}));
// Preserve authored surface normals/seams. Aggressively welding opposite shell
// faces produced damaged reflections in the actual browser and was rejected.
await doc.transform(weld(),simplify({simplifier:MeshoptSimplifier,ratio:.25,error:.002}));
await doc.transform(prune(),center({pivot:'below'}),
  meshopt({encoder:MeshoptEncoder,level:'high',quantizePosition:16,quantizeNormal:12,quantizeTexcoord:14}));
doc.getRoot().setExtras({license:'CC-BY-4.0',author:'vicent091036',
  derivative:'Aeroline parked roadster: existing fictional livery, assembled measured wheels, opaque parked glazing and simplified static detail.'});
const target=path.join(game,'OpenRally/public/models/vehicles/aero-parked.glb');
await io.write(target,doc);
const checked=await io.read(target),bounds=getBounds(checked.getRoot().listScenes()[0]);
const triangles=checked.getRoot().listMeshes().reduce((n,m)=>n+m.listPrimitives().reduce((s,p)=>s+p.getIndices().getCount()/3,0),0);
if(triangles>160000||bounds.max[1]>1.8||Math.abs(bounds.min[1])>.005)
  throw Error('Parked vehicle exceeds its geometry/grounding budget: '+JSON.stringify({triangles,bounds}));
const sha=async file=>crypto.createHash('sha256').update(await fs.readFile(file)).digest('hex');
const report={sourceBody:'models/vehicles/stradale-gt_opt.glb',sourceBodySha256:await sha(sourceBody),
  sourceWheelSha256:await sha(sourceWheels),target:'models/vehicles/aero-parked.glb',sha256:await sha(target),
  bytes:(await fs.stat(target)).size,triangles,bounds,meshes:checked.getRoot().listMeshes().length,
  materialNames:checked.getRoot().listMaterials().map(m=>m.getName()),wheelHubsBeforeGrounding:hubs,
  lossless:false,originalsModified:false,license:'CC-BY-4.0'};
await fs.mkdir(path.join(game,'research/next-release'),{recursive:true});
await fs.writeFile(path.join(game,'research/next-release/parked-aero.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify(report));
