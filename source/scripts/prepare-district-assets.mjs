/** Reproducible CC0 runtime exports. Original masters are never modified. */
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {dedup,prune,weld,simplify,textureCompress,meshopt,center,getBounds} from '@gltf-transform/functions';
import {MeshoptSimplifier,MeshoptEncoder,MeshoptDecoder} from 'meshoptimizer';
import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';
const game=path.resolve(import.meta.dirname,'../..');
const pub=path.join(game,'OpenRally/public');
const report=[];
const selected=process.argv.slice(2);
sharp.concurrency(1);
await Promise.all([MeshoptSimplifier.ready,MeshoptEncoder.ready,MeshoptDecoder.ready]);
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder,'meshopt.decoder':MeshoptDecoder});
await fs.mkdir(path.join(pub,'models/coastal'),{recursive:true});
await fs.mkdir(path.join(pub,'textures/coastal'),{recursive:true});
for(const id of selected.length?[]:['red_brick','white_stucco','exterior_wall_cladding','grass_ground','rectangular_paving']){
  for(const [channel,extension] of [['color','jpg'],['normal','png'],['roughness','png']]){
    const input=path.join(game,'assets/aeroline/graphics-1.17/materials',id,channel+'.'+extension);
    for(const size of [1024,512]){
      const name=`${id}-${channel}${size===512?'-mobile':''}.webp`;
      // Only color is perceptually encoded; data channels preserve the resized pixels.
      const pipeline=sharp(input).resize(size,size,{fit:'inside'});
      await pipeline.webp(channel==='color'?{quality:90,effort:4}:{lossless:true,effort:4}).toFile(path.join(pub,'textures/coastal',name));
    }
  }
}
for(const id of selected.length?selected:['painted_wooden_bench','street_lamp_01','utility_box_02','shrub_01','island_tree_02']){
  const input=id==='island_tree_02'?path.join(game,'research/graphics-1.17/variants/island_tree_02-authored.glb'):
    path.join(game,'assets/aeroline/graphics-1.17/masters',id,id+'_1k.gltf');
  for(const mobile of [false,true]){
    const doc=await io.read(input);
    if(id==='shrub_01'){
      const alphaPath=path.join(game,'assets/aeroline/graphics-1.17/masters/shrub_01/textures/shrub_01_alpha_1k.png');
      const alpha=await sharp(alphaPath).extractChannel(0).raw().toBuffer({resolveWithObject:true});
      for(const material of doc.getRoot().listMaterials()){
        const color=material.getBaseColorTexture();
        if(material.getAlphaMode()!=='MASK'||!color)continue;
        const size=await sharp(color.getImage()).metadata();
        if(size.width!==alpha.info.width||size.height!==alpha.info.height)throw new Error('Foliage alpha dimensions mismatch');
        const rgb=await sharp(color.getImage()).removeAlpha().png().toBuffer();
        const rgba=await sharp(rgb).joinChannel(alpha.data,{raw:alpha.info}).png().toBuffer();
        color.setImage(rgba).setMimeType('image/png');
      }
    }
    for(const material of doc.getRoot().listMaterials())if(material.getName().includes('leaves'))material.setAlphaMode('MASK').setAlphaCutoff(.35);
    const originals=new Map(doc.getRoot().listTextures().map(texture=>[texture,{bytes:texture.getImage(),mime:texture.getMimeType(),size:texture.getSize()}]));
    await doc.transform(dedup(),weld());
    // The authored tree uses small leaf geometry; leave it intact at near range.
    if(id!=='island_tree_02')await doc.transform(simplify({simplifier:MeshoptSimplifier,
      ratio:id==='painted_wooden_bench'?1:id==='shrub_01'?0.08:0.22,error:0.002}));
    await doc.transform(prune(),center({pivot:'below'}),
      textureCompress({encoder:sharp,targetFormat:'webp',resize:[mobile?512:1024,mobile?512:1024],slots:/baseColorTexture/,quality:90,effort:4}),
      textureCompress({encoder:sharp,targetFormat:'webp',resize:[mobile?512:1024,mobile?512:1024],slots:/^(?!baseColorTexture$)/,lossless:true,effort:4}),
      meshopt({encoder:MeshoptEncoder,level:'high',quantizePosition:16,quantizeNormal:12,quantizeTexcoord:14}));
    if(!mobile)for(const texture of doc.getRoot().listTextures()){
      const original=originals.get(texture);
      if(original?.bytes&&original.size?.every(n=>n<=1024)&&original.bytes.length<texture.getImage().length){
        texture.setImage(original.bytes).setMimeType(original.mime);
      }
    }
    const target=path.join(pub,'models/coastal',id+(mobile?'-mobile':'')+'.glb');
    await io.write(target,doc);
    const checked=await io.read(target);
    const triangles=checked.getRoot().listMeshes().reduce((sum,m)=>sum+m.listPrimitives().reduce((n,p)=>n+p.getIndices().getCount()/3,0),0);
    const record={id,mobile,triangles,bytes:(await fs.stat(target)).size,bounds:getBounds(checked.getRoot().listScenes()[0]),
      materials:checked.getRoot().listMaterials().map(m=>({name:m.getName(),alphaMode:m.getAlphaMode(),doubleSided:m.getDoubleSided()}))};
    report.push(record);console.log(JSON.stringify(record));
  }
}
const reportPath=path.join(game,'research/graphics-1.17/runtime-asset-report.json');
const previous=selected.length?JSON.parse(await fs.readFile(reportPath,'utf8')):[];
await fs.writeFile(reportPath,JSON.stringify([...previous.filter(r=>!selected.includes(r.id)),...report],null,2));
