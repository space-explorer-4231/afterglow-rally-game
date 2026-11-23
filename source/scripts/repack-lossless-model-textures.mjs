/** Repack only embedded image bytes; geometry, animation, materials and licenses are untouched. */
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import crypto from 'node:crypto';

const root = path.resolve(import.meta.dirname, '..');
const targets = process.argv.slice(2);
if (!targets.length) targets.push('models/coastal/island_tree_02.glb', 'models/coastal/island_tree_02-mobile.glb');
const backupRoot = path.resolve(root, '../assets/aeroline/lossless-1.36');
const report = [];
function parse(buffer) {
  if (buffer.readUInt32LE(0) !== 0x46546c67 || buffer.readUInt32LE(4) !== 2) throw Error('Expected GLB 2');
  const jsonLength = buffer.readUInt32LE(12), binHeader = 20 + jsonLength;
  if (buffer.readUInt32LE(binHeader + 4) !== 0x004e4942) throw Error('Expected embedded BIN');
  return { json: JSON.parse(buffer.subarray(20, binHeader).toString()), bin: buffer.subarray(binHeader + 8, binHeader + 8 + buffer.readUInt32LE(binHeader)) };
}
const hash = buffer => crypto.createHash('sha256').update(buffer).digest('hex');
for (const relative of targets) {
  const file = path.resolve(root, 'public', relative);
  if (!file.startsWith(path.resolve(root, 'public') + path.sep)) throw Error('Target outside public');
  const original = await fs.readFile(file), {json, bin} = parse(original);
  const replacements = [];
  for (const image of json.images || []) {
    if (image.bufferView === undefined) continue;
    const view = json.bufferViews[image.bufferView];
    if (view.buffer !== 0) throw Error('Image must use embedded buffer');
    const start = view.byteOffset || 0, source = bin.subarray(start, start + view.byteLength);
    const metadata = await sharp(source).metadata();
    if (metadata.hasProfile || image.mimeType !== 'image/webp') continue;
    const compressed = await sharp(source).webp({lossless:true, effort:6}).toBuffer();
    if (compressed.length >= source.length) continue;
    const before = await sharp(source).raw().toBuffer({resolveWithObject:true});
    const after = await sharp(compressed).raw().toBuffer({resolveWithObject:true});
    if (JSON.stringify(before.info) !== JSON.stringify(after.info) || !before.data.equals(after.data)) throw Error('Decoded pixels changed');
    // Preserve every subsequent byte offset alignment, including meshopt's 8-byte alignment.
    const pad = (source.length - compressed.length) % 8;
    replacements.push({start, end:start + source.length, compressed, pad, image, viewIndex:image.bufferView});
  }
  replacements.sort((a,b) => a.start-b.start);
  if (!replacements.length) { report.push({file:relative, before:original.length, after:original.length, savings:0}); continue; }
  for (let i=1;i<replacements.length;i++) if(replacements[i].start < replacements[i-1].end) throw Error('Overlapping images');
  const mapOffset = offset => offset - replacements.filter(r=>r.end<=offset).reduce((n,r)=>n+(r.end-r.start-r.compressed.length-r.pad),0);
  const parts=[]; let cursor=0;
  for(const r of replacements) { parts.push(bin.subarray(cursor,r.start),r.compressed,Buffer.alloc(r.pad));cursor=r.end; }
  parts.push(bin.subarray(cursor));
  const outputBin=Buffer.concat(parts);
  const sourceViews=structuredClone(json.bufferViews);
  for(const view of json.bufferViews) {
    if(view.buffer===0) view.byteOffset=mapOffset(view.byteOffset||0);
    const ext=view.extensions?.EXT_meshopt_compression;
    if(ext?.buffer===0) ext.byteOffset=mapOffset(ext.byteOffset||0);
  }
  for(const r of replacements) json.bufferViews[r.viewIndex].byteLength=r.compressed.length;
  json.buffers[0].byteLength-=bin.length-outputBin.length;
  // All geometry buffer ranges, including meshopt compressed payloads, must be byte-identical.
  const imageViews=new Set((json.images||[]).map(i=>i.bufferView));
  for(let i=0;i<sourceViews.length;i++) {
    const before=sourceViews[i],after=json.bufferViews[i];
    if(!imageViews.has(i)&&before.buffer===0) {
      if(!bin.subarray(before.byteOffset||0,(before.byteOffset||0)+before.byteLength).equals(outputBin.subarray(after.byteOffset||0,(after.byteOffset||0)+after.byteLength)))throw Error('Geometry bytes changed');
    }
    const oldExt=before.extensions?.EXT_meshopt_compression,newExt=after.extensions?.EXT_meshopt_compression;
    if(oldExt?.buffer===0&&!bin.subarray(oldExt.byteOffset||0,(oldExt.byteOffset||0)+oldExt.byteLength).equals(outputBin.subarray(newExt.byteOffset||0,(newExt.byteOffset||0)+newExt.byteLength)))throw Error('Meshopt bytes changed');
  }
  let jsonBytes=Buffer.from(JSON.stringify(json));
  jsonBytes=Buffer.concat([jsonBytes,Buffer.alloc((4-jsonBytes.length%4)%4,32)]);
  const header=Buffer.alloc(20),binHeader=Buffer.alloc(8);
  header.writeUInt32LE(0x46546c67,0);header.writeUInt32LE(2,4);header.writeUInt32LE(28+jsonBytes.length+outputBin.length,8);header.writeUInt32LE(jsonBytes.length,12);header.writeUInt32LE(0x4e4f534a,16);
  binHeader.writeUInt32LE(outputBin.length,0);binHeader.writeUInt32LE(0x004e4942,4);
  const output=Buffer.concat([header,jsonBytes,binHeader,outputBin]);
  const backup=path.join(backupRoot,relative);await fs.mkdir(path.dirname(backup),{recursive:true});
  await fs.writeFile(backup,original,{flag:'wx'}).catch(error=>{if(error.code!=='EEXIST')throw error;});
  await fs.writeFile(file,output);
  const row={file:relative,before:original.length,after:output.length,savings:original.length-output.length,imagesRecompressed:replacements.length,pixelsUnchanged:true,geometryBytesUnchanged:true,beforeSHA256:hash(original),afterSHA256:hash(output)};
  report.push(row);console.log(JSON.stringify(row));
}
const reportPath=path.resolve(root,'../verification/lossless-model-textures-1.36.0.json');
await fs.writeFile(reportPath,JSON.stringify({report,totalSavings:report.reduce((n,r)=>n+r.savings,0)},null,2));
