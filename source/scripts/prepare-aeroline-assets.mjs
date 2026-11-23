import sharp from 'sharp';
import {Color} from 'three';
import {readFile,writeFile,mkdir,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';

// Paint-only edit: do not simplify or quantize the already decoded geometry again.
const svg='<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="2048"><rect width="1024" height="2048" fill="#f0f5ff"/><path d="M410 0h82v2048h-82zM532 0h82v2048h-82z" fill="#1556df"/><path d="M400 0h7v2048h-7zM617 0h7v2048h-7z" fill="#93ccff"/></svg>';
const png=await sharp(Buffer.from(svg)).png({compressionLevel:9}).toBuffer();
const report=[];
for(const name of ['stradale-gt.glb','stradale-gt_opt.glb','stradale-gt-wheel.glb']){
  const file='public/models/vehicles/'+name, input=await readFile(file);
  const jsonLength=input.readUInt32LE(12), json=JSON.parse(input.subarray(20,20+jsonLength).toString().trim());
  const binStart=20+jsonLength+8, originalBin=input.subarray(binStart);
  const imageOffset=Math.ceil(originalBin.length/4)*4;
  let painted=false;
  for(const material of json.materials){
    const id=material.name, pbr=material.pbrMetallicRoughness ??= {};
    if(id==='Body_Color'){
      const texture=json.textures[pbr.baseColorTexture.index];
      json.bufferViews.push({buffer:0,byteOffset:imageOffset,byteLength:png.length});
      json.images[texture.source]={bufferView:json.bufferViews.length-1,mimeType:'image/png'};
      pbr.baseColorFactor=[1,1,1,1];pbr.metallicFactor=0.22;pbr.roughnessFactor=0.25;painted=true;
    }
    if(/metal/.test(id)){const c=new Color('#66758b');pbr.baseColorFactor=[c.r,c.g,c.b,1];pbr.metallicFactor=0.88;pbr.roughnessFactor=0.23;}
    if(id==='Interior_light'){const c=new Color('#2f4260');pbr.baseColorFactor=[c.r,c.g,c.b,1];pbr.roughnessFactor=0.8;}
  }
  const bin=painted?Buffer.concat([originalBin,Buffer.alloc(imageOffset-originalBin.length),png]):originalBin;
  json.buffers[0].byteLength=bin.length;
  json.extras={...json.extras,aeroline:'1.15 pearl-white/blue livery; original compressed geometry bytes preserved exactly.'};
  const text=Buffer.from(JSON.stringify(json)), paddedJson=Buffer.concat([text,Buffer.alloc((4-text.length%4)%4,32)]);
  const paddedBin=Buffer.concat([bin,Buffer.alloc((4-bin.length%4)%4)]), header=Buffer.alloc(20), binHeader=Buffer.alloc(8);
  header.writeUInt32LE(0x46546c67,0);header.writeUInt32LE(2,4);header.writeUInt32LE(28+paddedJson.length+paddedBin.length,8);
  header.writeUInt32LE(paddedJson.length,12);header.writeUInt32LE(0x4e4f534a,16);
  binHeader.writeUInt32LE(paddedBin.length,0);binHeader.writeUInt32LE(0x004e4942,4);
  await writeFile(file,Buffer.concat([header,paddedJson,binHeader,paddedBin]));report.push({name,bytes:(await stat(file)).size,geometry:'Original compressed bytes unchanged'});
}
await mkdir('public/images/aeroline',{recursive:true});
const master=await readFile('../assets/aeroline/loading-concept-master.png');
await sharp(master).webp({lossless:true,effort:6}).toFile('public/images/aeroline/coastal-drive.webp');
const logo='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 120" role="img" aria-label="Aeroline"><path d="M12 90 58 16h32L44 90zm48 0 18-28h36l-17 28z" fill="#1556df"/><text x="135" y="87" fill="#09254a" font-family="Arial,sans-serif" font-size="72" font-weight="800" letter-spacing="6">AEROLINE</text></svg>';
await writeFile('public/aeroline-logo.svg',logo);
const icon='<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180"><rect width="180" height="180" rx="38" fill="#edf5ff"/><path d="M34 138 100 32h42L76 138zm54 0 23-35h38l-21 35z" fill="#1556df"/></svg>';
await writeFile('public/aeroline-icon.svg',icon);
await sharp(Buffer.from(icon)).png().toFile('public/apple-touch-icon.png');
for(const size of [16,32])await sharp(Buffer.from(icon)).resize(size,size).png().toFile(`public/favicon-${size}x${size}.png`);
const records=[];
await mkdir('../research/aeroline-materials',{recursive:true});
for(const [asset,prefix] of [['sandy_gravel_02','gravel'],['snow_02','snow'],['rock_boulder_dry','rock']]){
  const response=await fetch('https://api.polyhaven.com/files/'+asset);if(!response.ok)throw Error('Asset API '+response.status);
  const files=await response.json();
  for(const [key,suffix] of [['Diffuse','albedo'],['nor_gl','normal'],['Rough','roughness']]){
    const entry=files[key]?.['1k']?.png ?? files[key]?.['1k']?.jpg;if(!entry)throw Error('Missing '+asset+' '+key);
    const response=await fetch(entry.url);if(!response.ok)throw Error('Download '+response.status);
    const bytes=Buffer.from(await response.arrayBuffer());
    if(entry.md5 && createHash('md5').update(bytes).digest('hex')!==entry.md5)throw Error('Checksum failed');
    const name=`${prefix}-${suffix}`;
    await writeFile('../research/aeroline-materials/'+name+'.'+(entry.url.endsWith('.png')?'png':'jpg'),bytes);
    await sharp(bytes).webp({lossless:true,effort:6}).toFile(`public/textures/pbr/${name}.webp`);
    await sharp(bytes).resize(512,512).webp({lossless:true,effort:6}).toFile(`public/textures/pbr/${name}-mobile.webp`);
    records.push({asset,key,url:entry.url,license:'CC0-1.0',sha256:createHash('sha256').update(bytes).digest('hex')});
  }
}
await writeFile('../research/aeroline-assets-1.15.json',JSON.stringify({models:report,materials:records,artwork:'Original AI-generated coastal concept, lossless WebP; master in assets/aeroline.'},null,2));
console.log(JSON.stringify(report));console.log('Original loading artwork and three verified CC0 PBR material sets ready.');
