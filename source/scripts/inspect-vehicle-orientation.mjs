import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import draco3d from 'draco3dgltf';
import {Matrix4,Vector3} from 'three';

// Verify the physical front using authored lamp geometry, not asset filenames.
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'draco3d.decoder':await draco3d.createDecoderModule()});
const doc=await io.read(new URL('../public/models/vehicles/stradale-gt_opt.glb',import.meta.url).pathname.replace(/^\/([A-Z]:)/,'$1'));
const lamps=new Map(); const point=new Vector3(); const element=[0,0,0];
for(const node of doc.getRoot().listNodes()){
  const mesh=node.getMesh(); if(!mesh)continue;
  const transform=new Matrix4().fromArray(node.getWorldMatrix());
  for(const primitive of mesh.listPrimitives()){
    const name=primitive.getMaterial()?.getName(); if(!/Projector|Taillight/.test(name??''))continue;
    const data=primitive.getAttribute('POSITION'); const record=lamps.get(name)??{count:0,x:0,y:0,z:0};
    for(let i=0;i<data.getCount();i++){
      data.getElement(i,element);point.fromArray(element).applyMatrix4(transform);
      record.count++;record.x+=point.x;record.y+=point.y;record.z+=point.z;
    }
    lamps.set(name,record);
  }
}
for(const [name,r] of lamps)console.log(name,JSON.stringify({x:r.x/r.count,y:r.y/r.count,z:r.z/r.count}));
