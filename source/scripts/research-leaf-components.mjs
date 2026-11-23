/** Simplify each disconnected leaf within its own error scale, retaining canopy coverage. */
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {MeshoptSimplifier} from 'meshoptimizer';
import {dedup,weld,prune} from '@gltf-transform/functions';
import path from 'node:path';
import fs from 'node:fs/promises';
const game=path.resolve(import.meta.dirname,'../..');
await MeshoptSimplifier.ready;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc=await io.read(path.join(game,'research/graphics-1.17/variants/island_tree_02-authored.glb'));
await doc.transform(dedup(),weld());
const report=[];
for(const mesh of doc.getRoot().listMeshes())for(const primitive of mesh.listPrimitives()){
  if(!primitive.getMaterial().getName().includes('leaves'))continue;
  const position=primitive.getAttribute('POSITION'),uv=primitive.getAttribute('TEXCOORD_0'),normal=primitive.getAttribute('NORMAL');
  const positions=position.getArray(),indices=primitive.getIndices().getArray(),count=position.getCount();
  const remap=MeshoptSimplifier.generatePositionRemap(positions,3);
  const parents=Uint32Array.from({length:count},(_,i)=>i);
  const find=i=>{while(parents[i]!==i){parents[i]=parents[parents[i]];i=parents[i];}return i;};
  const join=(a,b)=>{parents[find(a)]=find(b);};
  for(let i=0;i<indices.length;i+=3){join(remap[indices[i]],remap[indices[i+1]]);join(remap[indices[i]],remap[indices[i+2]]);}
  const components=new Map();
  for(let i=0;i<indices.length;i+=3){const root=find(remap[indices[i]]);let list=components.get(root);if(!list){list=[];components.set(root,list);}list.push(indices[i],indices[i+1],indices[i+2]);}
  const output=[];let largest=0;
  for(const original of components.values()){
    largest=Math.max(largest,original.length/3);
    const lookup=new Map(),global=[];
    const localIndices=Uint32Array.from(original,i=>{if(!lookup.has(i)){lookup.set(i,global.length);global.push(i);}return lookup.get(i);});
    const localPositions=new Float32Array(global.length*3),attributes=new Float32Array(global.length*5);
    for(let i=0;i<global.length;i++){
      for(let axis=0;axis<3;axis++){localPositions[i*3+axis]=positions[global[i]*3+axis];attributes[i*5+axis]=normal.getArray()[global[i]*3+axis];}
      attributes[i*5+3]=uv.getArray()[global[i]*2];attributes[i*5+4]=uv.getArray()[global[i]*2+1];
    }
    const [reduced]=MeshoptSimplifier.simplifyWithAttributes(localIndices,localPositions,3,attributes,5,[.5,.5,.5,.8,.8],null,
      Math.max(6,Math.floor(original.length*.25/3)*3),.02,['Permissive','PreserveFolds']);
    // Empty components would remove whole leaves; retain the original instead.
    if(reduced.length<3)output.push(...original);else for(const i of reduced)output.push(global[i]);
  }
  primitive.getIndices().setArray(Uint32Array.from(output));
  report.push({sourceTriangles:indices.length/3,outputTriangles:output.length/3,components:components.size,largestComponentTriangles:largest});
}
await doc.transform(prune());
await io.write(path.join(game,'research/graphics-1.17/variants/island_tree_02-leaf-components.glb'),doc);
await fs.writeFile(path.join(game,'research/graphics-1.17/leaf-component-comparison.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify(report));
