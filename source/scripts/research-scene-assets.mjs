/** Compare bounded geometry / texture processing on immutable CC0 source masters. */
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {dedup,prune,weld,simplify,textureCompress,meshopt,getBounds} from '@gltf-transform/functions';
import {MeshoptSimplifier,MeshoptEncoder,MeshoptDecoder} from 'meshoptimizer';
import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';
import {performance} from 'node:perf_hooks';

const root=path.resolve(import.meta.dirname,'../..');
const masters=path.join(root,'assets/aeroline/graphics-1.17/masters');
const output=path.join(root,'research/graphics-1.17/variants');
await fs.mkdir(output,{recursive:true});
sharp.concurrency(1);
await Promise.all([MeshoptSimplifier.ready,MeshoptEncoder.ready,MeshoptDecoder.ready]);
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'meshopt.encoder':MeshoptEncoder,'meshopt.decoder':MeshoptDecoder,
});
const ids=process.argv.slice(2);
const selected=ids.length?ids:['painted_wooden_bench','utility_box_02','street_lamp_01','shrub_01','boulder_01','island_tree_02'];

function describe(document){
  const scene=document.getRoot().listScenes()[0];
  const meshes=document.getRoot().listMeshes();
  return {bounds:scene?getBounds(scene):null,
    triangles:meshes.reduce((sum,m)=>sum+m.listPrimitives().reduce((n,p)=>n+(p.getIndices()?.getCount()??p.getAttribute('POSITION')?.getCount()??0)/3,0),0),
    drawCalls:meshes.reduce((n,m)=>n+m.listPrimitives().length,0),
    nodes:document.getRoot().listNodes().map(n=>({name:n.getName(),translation:n.getTranslation(),scale:n.getScale()})),
    materials:document.getRoot().listMaterials().map(m=>({name:m.getName(),alphaMode:m.getAlphaMode(),doubleSided:m.getDoubleSided()})),
    textures:document.getRoot().listTextures().map(t=>({name:t.getName(),size:t.getSize(),bytes:t.getImage()?.byteLength??0})),
  };
}

const records=[];
for(const id of selected){
  const src=path.join(masters,id,id+'_1k.gltf');
  const original=describe(await io.read(src));
  const settings=id==='island_tree_02'||id==='shrub_01'
    ?[{name:'careful',ratio:0.08,error:0.002,texture:1024},{name:'balanced',ratio:0.025,error:0.008,texture:1024},{name:'mobile',ratio:0.012,error:0.02,texture:512}]
    :[{name:'balanced',ratio:id==='painted_wooden_bench'?1:0.22,error:0.002,texture:1024},{name:'mobile',ratio:id==='painted_wooden_bench'?1:0.1,error:0.008,texture:512}];
  for(const options of settings){
    const start=performance.now();
    const document=await io.read(src);
    await document.transform(dedup(),weld(),simplify({simplifier:MeshoptSimplifier,ratio:options.ratio,error:options.error}),prune(),
      textureCompress({encoder:sharp,targetFormat:'webp',resize:[options.texture,options.texture],lossless:true,effort:30}),
      meshopt({encoder:MeshoptEncoder,level:'high',quantizePosition:16,quantizeNormal:12,quantizeTexcoord:14}));
    const target=path.join(output,id+'-'+options.name+'.glb');
    await io.write(target,document);
    const checked=await io.read(target);
    const result={id,options,original,processed:describe(checked),bytes:(await fs.stat(target)).size,
      elapsedMs:Math.round(performance.now()-start),file:path.relative(root,target)};
    records.push(result);
    await fs.writeFile(path.join(root,'research/graphics-1.17/optimization-comparison.json'),JSON.stringify(records,null,2));
    console.log(JSON.stringify({id,variant:options.name,triangles:result.processed.triangles,originalTriangles:original.triangles,bytes:result.bytes,elapsedMs:result.elapsedMs}));
  }
}
