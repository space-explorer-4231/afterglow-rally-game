import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {brotliDecompressSync,gunzipSync} from 'node:zlib';

const report={models:[],textures:[],transport:[]};
function unpack(bytes){
  assert.equal(bytes.subarray(0,4).toString(),'glTF');
  assert.equal(bytes.readUInt32LE(8),bytes.length);
  const length=bytes.readUInt32LE(12);
  return {json:JSON.parse(bytes.subarray(20,20+length)),bin:bytes.subarray(28+length)};
}
for(const name of ['stradale-gt.glb','stradale-gt_opt.glb','stradale-gt-wheel.glb']){
  const original=unpack(await readFile('../backups/before-1.15/'+name));
  const next=unpack(await readFile('public/models/vehicles/'+name));
  assert.deepEqual(next.bin.subarray(0,original.bin.length),original.bin,'Original mesh bytes changed');
  assert.deepEqual(next.json.meshes,original.json.meshes,'Mesh declarations changed');
  assert.deepEqual(next.json.accessors,original.json.accessors,'Mesh precision changed');
  report.models.push({name,originalMeshBytesPreserved:true});
}
const sources=JSON.parse(await readFile('../research/aeroline-assets-1.15.json'));
const suffixes={Diffuse:'albedo',nor_gl:'normal',Rough:'roughness'};
const prefixes={sandy_gravel_02:'gravel',snow_02:'snow',rock_boulder_dry:'rock'};
for(const asset of sources.materials){
  const name=prefixes[asset.asset]+'-'+suffixes[asset.key];
  const original='../research/aeroline-materials/'+name+(asset.url.endsWith('.png')?'.png':'.jpg');
  const {data,info}=await sharp(original).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const decoded=await sharp('public/textures/pbr/'+name+'.webp').ensureAlpha().raw().toBuffer({resolveWithObject:true});
  assert.deepEqual(decoded.info,info);assert.deepEqual(decoded.data,data,'Texture pixels changed');
  report.textures.push({name,width:info.width,height:info.height,exactPixels:true});
}
const originalArt=await sharp('../assets/aeroline/loading-concept-master.png').ensureAlpha().raw().toBuffer();
assert.deepEqual(await sharp('public/images/aeroline/coastal-drive.webp').ensureAlpha().raw().toBuffer(),originalArt,'Artwork pixels changed');
for(const file of ['models/vehicles/stradale-gt_opt.glb','environments/rural-asphalt-road.hdr']){
  const original=await readFile('dist/'+file),br=await readFile('dist/'+file+'.br'),gz=await readFile('dist/'+file+'.gz');
  assert.deepEqual(brotliDecompressSync(br),original);assert.deepEqual(gunzipSync(gz),original);
  report.transport.push({file,originalBytes:original.length,brotliBytes:br.length,savedPercent:Math.round((1-br.length/original.length)*100),exactBytes:true});
}
await writeFile('../research/aeroline-lossless-1.15.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report));
