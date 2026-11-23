import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS, KHRMaterialsClearcoat} from '@gltf-transform/extensions';
import {clearNodeParent, compactPrimitive, transformPrimitive, getBounds, prune, weld, simplify, join, draco} from '@gltf-transform/functions';
import {MeshoptSimplifier} from 'meshoptimizer';
import draco3d from 'draco3dgltf';
import {Matrix4, Vector3, Color, BufferGeometry, BufferAttribute} from 'three';
import {fileURLToPath} from 'node:url';
import {writeFile, stat} from 'node:fs/promises';

// Adapt the attributed Three.js r185 example asset; keep the original in research.
const input=fileURLToPath(new URL('../../research/graphics-1.10/ferrari-original.glb',import.meta.url));
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'draco3d.decoder':await draco3d.createDecoderModule(),'draco3d.encoder':await draco3d.createEncoderModule(),
});
await MeshoptSimplifier.ready;
function finishMaterials(doc){
  // Remove badge surfaces; the playable car uses an original, fictional identity.
  for(const node of doc.getRoot().listNodes()){
    const mesh=node.getMesh();if(!mesh)continue;
    for(const primitive of [...mesh.listPrimitives()]){
      if(primitive.getMaterial()?.getName()==='Ferrari_Yellow'){mesh.removePrimitive(primitive);continue;}
      if(primitive.getMaterial()?.getName()!=='metal_chrome')continue;
      const positions=primitive.getAttribute('POSITION'),indices=primitive.getIndices();
      if(!positions||!indices)continue;
      const matrix=new Matrix4().fromArray(node.getWorldMatrix()),v=new Vector3(),value=[0,0,0],kept=[];
      const raw=indices.getArray();
      for(let i=0;i<raw.length;i+=3){
        let badge=true;
        for(let k=0;k<3;k++){
          positions.getElement(raw[i+k],value);v.fromArray(value).applyMatrix4(matrix);
          badge=badge && Math.abs(v.x)<0.22 && Math.abs(v.z)>1.95 && v.y>0.5 && v.y<1.15;
        }
        if(!badge)kept.push(raw[i],raw[i+1],raw[i+2]);
      }
      primitive.setIndices(indices.clone().setArray(new Uint32Array(kept)));compactPrimitive(primitive);
    }
  }
  const clearcoat=doc.createExtension(KHRMaterialsClearcoat);
  for(const m of doc.getRoot().listMaterials()){
    const name=m.getName(); m.setMetallicFactor(0).setRoughnessFactor(0.7);
    if(name==='Body_Color'){
      const c=new Color('#e85720');m.setBaseColorFactor([c.r,c.g,c.b,1]).setMetallicFactor(0.35).setRoughnessFactor(0.26);
      m.setExtension('KHR_materials_clearcoat',clearcoat.createClearcoat().setClearcoatFactor(1).setClearcoatRoughnessFactor(0.08));
    } else if(name.startsWith('metal'))m.setMetallicFactor(0.9).setRoughnessFactor(0.24);
    else if(name==='Glass_Gray')m.setBaseColorFactor([0.035,0.055,0.07,1]).setMetallicFactor(0.2).setRoughnessFactor(0.07).setAlphaMode('OPAQUE');
    else if(name==='Taillight_Glass'){
      const c=new Color('#b51926');m.setBaseColorFactor([c.r,c.g,c.b,1]).setEmissiveFactor([c.r*0.7,c.g*0.7,c.b*0.7]).setRoughnessFactor(0.2);
    }
    else if(name==='Projector_Glass')m.setBaseColorFactor([0.7,0.8,0.9,1]).setEmissiveFactor([0.3,0.4,0.5]).setRoughnessFactor(0.14);
    else if(name==='Tires')m.setBaseColorFactor([0.009,0.012,0.014,1]).setRoughnessFactor(0.92);
    else if(name==='Carbon_Fiber')m.setBaseColorFactor([0.015,0.018,0.02,1]).setRoughnessFactor(0.45);
    else if(name==='Interior_dark'||name==='Interior_light')m.setBaseColorFactor([0.016,0.02,0.025,1]).setRoughnessFactor(0.82);
    else if(name==='plastic_gray')m.setBaseColorFactor([0.022,0.027,0.032,1]).setRoughnessFactor(0.78);
  }
  doc.getRoot().setExtras({source:'Ferrari 458 Italia by vicent091036, Three.js r185 example',license:'CC-BY-4.0',changes:'Separated chassis/wheels; simplified geometry; orange clearcoat and distinct material finishes.'});
}
const body=await io.read(input);finishMaterials(body);
for(const n of body.getRoot().listNodes())if(/^wheel_(fl|fr|rl|rr)$/.test(n.getName())){
  for(const parent of [...n.listParents()])if(parent.propertyType==='Node')parent.removeChild(n);
}
await body.transform(prune(),weld(),simplify({simplifier:MeshoptSimplifier,ratio:0.55,error:0.001}),join(),prune(),draco({quantizePosition:14,quantizeNormal:12}));
const bodyFile=fileURLToPath(new URL('../public/models/vehicles/stradale-gt.glb',import.meta.url));await io.write(bodyFile,body);
const optimized=await io.read(bodyFile);
// Keep exterior paint and windows exactly as modeled. Simplify hidden/interior
// details for mobile; aggressive exterior reduction distorted the thin panels.
const protectedPrimitives=new Map();
for(const mesh of optimized.getRoot().listMeshes())for(const primitive of mesh.listPrimitives()){
  if(/^(Body_Color|Glass_Gray)$/.test(primitive.getMaterial().getName())){
    protectedPrimitives.set(primitive,{positions:new Float32Array(primitive.getAttribute('POSITION').getArray()),
      normals:new Float32Array(primitive.getAttribute('NORMAL').getArray()),indices:new Uint32Array(primitive.getIndices().getArray())});
  }
  primitive.setAttribute('NORMAL',null).setAttribute('TANGENT',null);
}
await optimized.transform(weld(),simplify({simplifier:MeshoptSimplifier,ratio:0.07,error:0.015}));
for(const mesh of optimized.getRoot().listMeshes())for(const primitive of mesh.listPrimitives()){
  const saved=protectedPrimitives.get(primitive);
  if(saved){
    primitive.setAttribute('POSITION',optimized.createAccessor().setType('VEC3').setArray(saved.positions));
    primitive.setAttribute('NORMAL',optimized.createAccessor().setType('VEC3').setArray(saved.normals));
    primitive.setIndices(optimized.createAccessor().setType('SCALAR').setArray(saved.indices));
    continue;
  }
  const geometry=new BufferGeometry();
  geometry.setAttribute('position',new BufferAttribute(new Float32Array(primitive.getAttribute('POSITION').getArray()),3));
  geometry.setIndex(new BufferAttribute(new Uint32Array(primitive.getIndices().getArray()),1));
  geometry.computeVertexNormals();
  primitive.setAttribute('NORMAL',optimized.createAccessor().setType('VEC3').setArray(new Float32Array(geometry.getAttribute('normal').array)));
  geometry.dispose();
}
await optimized.transform(prune(),draco({quantizePosition:16,quantizeNormal:12}));
const optimizedFile=bodyFile.replace('.glb','_opt.glb');await io.write(optimizedFile,optimized);

const wheel=await io.read(input);finishMaterials(wheel);
const root=wheel.getRoot().listNodes().find(n=>n.getName()==='wheel_fl');if(!root)throw Error('Missing wheel pivot');
const center=new Vector3(...root.getWorldTranslation());const bounds=getBounds(root);
const radius=Math.max(bounds.max[1]-bounds.min[1],bounds.max[2]-bounds.min[2])/2;
if(!Number.isFinite(radius)||radius<0.2||radius>0.5)throw Error('Unexpected wheel scale');
const normalize=new Matrix4().makeTranslation(0,0.0375,0)
  .multiply(new Matrix4().makeScale(0.0375/radius,0.0375/radius,0.0375/radius))
  .multiply(new Matrix4().makeRotationY(Math.PI))
  .multiply(new Matrix4().makeTranslation(-center.x,-center.y,-center.z));
const nodes=[];root.traverse(n=>{if(n.getMesh())nodes.push(n);});
for(const scene of wheel.getRoot().listScenes())for(const n of [...scene.listChildren()])scene.removeChild(n);
const scene=wheel.getRoot().listScenes()[0];
for(const node of nodes){
  const mesh=node.getMesh().clone();node.setMesh(mesh);
  const matrix=normalize.clone().multiply(new Matrix4().fromArray(node.getWorldMatrix()));
  for(const primitive of mesh.listPrimitives()){compactPrimitive(primitive);transformPrimitive(primitive,matrix.elements);}
  clearNodeParent(node);node.setTranslation([0,0,0]).setRotation([0,0,0,1]).setScale([1,1,1]);scene.addChild(node);
}
await wheel.transform(prune(),weld(),simplify({simplifier:MeshoptSimplifier,ratio:0.45,error:0.001}),join(),prune(),draco({quantizePosition:14,quantizeNormal:12}));
const wheelFile=fileURLToPath(new URL('../public/models/vehicles/stradale-gt-wheel.glb',import.meta.url));await io.write(wheelFile,wheel);
const results=[];
for(const file of [bodyFile,optimizedFile,wheelFile]){
  const doc=await io.read(file);const triangles=doc.getRoot().listMeshes().reduce((s,m)=>s+m.listPrimitives().reduce((n,p)=>n+(p.getIndices()?.getCount()??p.getAttribute('POSITION').getCount())/3,0),0);
  results.push({file,bytes:(await stat(file)).size,triangles,bounds:getBounds(doc.getRoot().listScenes()[0]),materials:doc.getRoot().listMaterials().map(m=>m.getName())});
}
await writeFile(new URL('../../research/graphics-1.10/stradale-report.json',import.meta.url),JSON.stringify(results,null,2));console.log(JSON.stringify(results));
