import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {getBounds} from '@gltf-transform/functions';
import draco3d from 'draco3dgltf';
import {writeFile} from 'node:fs/promises';
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'draco3d.decoder':await draco3d.createDecoderModule()});
const report=[];
for(const name of ['wheel.glb','wheel_opt.glb','stradale-gt-wheel.glb']){
  const doc=await io.read('public/models/vehicles/'+name);
  const {min,max}=getBounds(doc.getRoot().listScenes()[0]);
  report.push({name,min,max,center:min.map((v,i)=>(v+max[i])/2),radius:Math.max(max[1]-min[1],max[2]-min[2])/2});
}
await writeFile('../research/wheel-pivots-1.15.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report));
const original=await io.read('../research/graphics-1.10/ferrari-original.glb');
for(const node of original.getRoot().listNodes())if(/^wheel_/.test(node.getName()))console.log(node.getName(),node.getWorldTranslation());
