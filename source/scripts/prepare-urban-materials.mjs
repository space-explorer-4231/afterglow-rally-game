import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import sharp from 'sharp';

const research=fileURLToPath(new URL('../../research/graphics-1.12/',import.meta.url));
const output=fileURLToPath(new URL('../public/textures/urban/',import.meta.url));
await mkdir(research,{recursive:true});await mkdir(output,{recursive:true});
const manifest=[];
for(const [asset,prefix] of [['concrete_wall_006','concrete'],['concrete_pavers_02','pavers']]){
  const response=await fetch('https://api.polyhaven.com/files/'+asset);
  if(!response.ok)throw Error('Texture metadata '+response.status);
  const metadata=await response.json();
  await writeFile(research+asset+'.json',JSON.stringify(metadata,null,2));
  for(const [channel,suffix] of [['Diffuse','color'],['nor_gl','normal'],['Rough','roughness']]){
    const source=metadata[channel]?.['1k']?.jpg;
    if(!source?.url||!source?.md5)throw Error('Missing '+asset+' '+channel);
    const download=await fetch(source.url);if(!download.ok)throw Error('Download '+download.status);
    const bytes=Buffer.from(await download.arrayBuffer());
    if(createHash('md5').update(bytes).digest('hex')!==source.md5)throw Error('Source checksum mismatch');
    await writeFile(research+asset+'-'+suffix+'.jpg',bytes);
    for(const size of [256,512]){
      const name=prefix+'-'+suffix+(size===256?'-mobile':'')+'.webp';
      const optimized=await sharp(bytes).resize(size,size).webp({quality:suffix==='color'?87:suffix==='normal'?88:96,effort:6}).toBuffer();
      await writeFile(output+name,optimized);
      manifest.push({asset,license:'CC0',source:source.url,sourceMd5:source.md5,file:name,bytes:optimized.length,
        sha256:createHash('sha256').update(optimized).digest('hex')});
    }
  }
}
await writeFile(research+'optimized-materials.json',JSON.stringify(manifest,null,2));
console.log('Urban pack:',manifest.reduce((sum,file)=>sum+file.bytes,0),'bytes including mobile + desktop variants');
