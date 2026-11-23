import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {draco, prune} from '@gltf-transform/functions';
import draco3d from 'draco3dgltf';
import {Matrix4, Vector3, Color} from 'three';
import sharp from 'sharp';
import {fileURLToPath} from 'node:url';
import {stat} from 'node:fs/promises';

// Original Speedrunner livery on the previously licensed/adapted chassis.
// Geometry, attribution and separated wheel pivots are preserved.
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'draco3d.decoder':await draco3d.createDecoderModule(),
  'draco3d.encoder':await draco3d.createEncoderModule(),
});
const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="2048">
  <rect width="1024" height="2048" fill="#087f86"/>
  <path d="M410 0h82v2048h-82zM532 0h82v2048h-82z" fill="#152a32"/>
  <path d="M400 0h7v2048h-7zM617 0h7v2048h-7z" fill="#e0a675"/>
</svg>`;
const png=await sharp(Buffer.from(svg)).png({compressionLevel:9}).toBuffer();
for(const filename of ['stradale-gt.glb','stradale-gt_opt.glb','stradale-gt-wheel.glb']){
  const path=fileURLToPath(new URL('../public/models/vehicles/'+filename,import.meta.url));
  const doc=await io.read(path);
  const buffer=doc.getRoot().listBuffers()[0];
  const texture=doc.createTexture('Speedrunner teal / graphite / copper').setImage(png).setMimeType('image/png');
  let painted=0;
  for(const node of doc.getRoot().listNodes()){
    const matrix=new Matrix4().fromArray(node.getWorldMatrix());
    for(const primitive of node.getMesh()?.listPrimitives()??[]){
      const material=primitive.getMaterial();
      if(material?.getName()!=='Body_Color')continue;
      const positions=primitive.getAttribute('POSITION');if(!positions)throw Error('Missing body positions');
      const uv=new Float32Array(positions.getCount()*2),point=new Vector3(),value=[0,0,0];
      for(let i=0;i<positions.getCount();i++){
        positions.getElement(i,value);point.fromArray(value).applyMatrix4(matrix);
        uv[i*2]=point.x/2+0.5;uv[i*2+1]=point.z/4.45+0.5;
      }
      primitive.setAttribute('TEXCOORD_0',doc.createAccessor().setBuffer(buffer).setType('VEC2').setArray(uv));
      material.setBaseColorFactor([1,1,1,1]).setBaseColorTexture(texture).setMetallicFactor(0.38).setRoughnessFactor(0.24);
      painted++;
    }
  }
  if(!filename.includes('wheel')&&!painted)throw Error('Paint material missing');
  for(const material of doc.getRoot().listMaterials()){
    if(/metal/.test(material.getName())){
      const color=new Color(filename.includes('wheel')?'#c88e5f':'#728b90');
      material.setBaseColorFactor([color.r,color.g,color.b,1]).setMetallicFactor(0.9).setRoughnessFactor(0.28);
    }
  }
  const extras=doc.getRoot().getExtras();
  doc.getRoot().setExtras({...extras,changes:String(extras.changes??'')+' Speedrunner 1.12: original teal/graphite touring stripes, copper rims, retained clearcoat and geometry.'});
  await doc.transform(prune(),draco({quantizePosition:16,quantizeNormal:12,quantizeTexcoord:14}));
  await io.write(path,doc);
  console.log(filename,painted,'paint primitives,',(await stat(path)).size,'bytes');
}
