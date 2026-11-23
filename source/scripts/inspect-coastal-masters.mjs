/** Compare source and runtime bounds without changing either asset. */
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {getBounds} from '@gltf-transform/functions';
import {MeshoptDecoder} from 'meshoptimizer';
import path from 'node:path';
await MeshoptDecoder.ready;
const game=path.resolve(import.meta.dirname,'../..');
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});
for(const asset of ['shrub_01','painted_wooden_bench','street_lamp_01','utility_box_02']){
  for(const variant of ['master','runtime']){
    const file=variant==='master'?`assets/aeroline/graphics-1.17/masters/${asset}/${asset}_1k.gltf`:`OpenRally/public/models/coastal/${asset}.glb`;
    const doc=await io.read(path.join(game,file));
    const triangles=doc.getRoot().listMeshes().reduce((sum,mesh)=>sum+mesh.listPrimitives().reduce((n,p)=>n+(p.getIndices()?.getCount()??p.getAttribute('POSITION').getCount())/3,0),0);
    console.log(JSON.stringify({asset,variant,triangles,bounds:getBounds(doc.getRoot().listScenes()[0])}));
  }
}
