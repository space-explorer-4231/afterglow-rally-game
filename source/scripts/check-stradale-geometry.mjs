import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import draco3d from 'draco3dgltf';
import {getBounds} from '@gltf-transform/functions';
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'draco3d.decoder':await draco3d.createDecoderModule()});
for(const file of ['../backups/before-1.12/models/stradale-gt_opt.glb','public/models/vehicles/stradale-gt_opt.glb','public/models/vehicles/stradale-gt.glb']){
  const doc=await io.read(file);
  console.log(file,getBounds(doc.getRoot().listScenes()[0]));
  for(const mesh of doc.getRoot().listMeshes())for(const primitive of mesh.listPrimitives()){
    const positions=primitive.getAttribute('POSITION'),normals=primitive.getAttribute('NORMAL');
    const badNormals=normals?Array.from(normals.getArray()).filter(v=>!Number.isFinite(v)).length:0;
    console.log(primitive.getMaterial()?.getName(),positions.getCount(),primitive.getIndices()?.getCount()/3,'non-finite normals',badNormals);
  }
}
