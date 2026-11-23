import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
import ffmpeg from 'ffmpeg-static';
import { execFileSync } from 'node:child_process';
const root = path.resolve(import.meta.dirname, '..');
const originals = path.resolve(root, '../research/cc0-originals');
await fs.mkdir(originals, { recursive: true });
const records = [];
async function download(url, name, expectedMd5) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status}: ${url}`);
  const bytes = Buffer.from(await res.arrayBuffer());
  if (expectedMd5 && crypto.createHash('md5').update(bytes).digest('hex') !== expectedMd5) throw new Error(`Checksum: ${name}`);
  await fs.writeFile(path.join(originals, name), bytes);
  records.push({ name, url, bytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex'), license: 'CC0-1.0' });
  return bytes;
}
const asphalt = await (await fetch('https://api.polyhaven.com/files/asphalt_02')).json();
const maps = [['Diffuse','asphalt-albedo',82], ['nor_gl','asphalt-normal',94], ['Rough','asphalt-roughness',90]];
await fs.mkdir(path.join(root, 'public/textures/pbr'), { recursive: true });
for (const [key,name,quality] of maps) {
  const item = asphalt[key]?.['1k']?.jpg;
  if (!item) throw new Error(`Missing map ${key}; available: ${Object.keys(asphalt)}`);
  const bytes = await download(item.url, `${name}.jpg`, item.md5);
  await sharp(bytes).webp({ quality }).toFile(path.join(root, `public/textures/pbr/${name}.webp`));
  await sharp(bytes).resize(512,512).webp({quality}).toFile(path.join(root, `public/textures/pbr/${name}-mobile.webp`));
}
const metal = await (await fetch('https://api.polyhaven.com/files/corrugated_iron')).json();
for (const [key,name,quality] of [['Diffuse','metal-albedo',82],['nor_gl','metal-normal',94],['Rough','metal-roughness',90],['Metal','metal-metalness',90]]) {
  const item = metal[key]?.['1k']?.jpg;
  if (!item) throw new Error(`Missing metal map ${key}`);
  const bytes = await download(item.url, `${name}.jpg`, item.md5);
  await sharp(bytes).webp({quality}).toFile(path.join(root, `public/textures/pbr/${name}.webp`));
  await sharp(bytes).resize(512,512).webp({quality}).toFile(path.join(root, `public/textures/pbr/${name}-mobile.webp`));
}
const road = await (await fetch('https://api.polyhaven.com/files/rural_asphalt_road')).json();
const hdr = road.hdri['1k'].hdr;
const hdrBytes = await download(hdr.url, 'rural-asphalt-road.hdr', hdr.md5);
await fs.mkdir(path.join(root, 'public/environments'), { recursive: true });
await fs.writeFile(path.join(root, 'public/environments/rural-asphalt-road.hdr'), hdrBytes);
await fs.mkdir(path.join(root, 'public/sounds/radio'), { recursive: true });
for (const [name,url] of [
  ['black-diamond.mp3','https://opengameart.org/sites/default/files/Black%20Diamond.mp3'],
  ['final-hour.mp3','https://opengameart.org/sites/default/files/Final-Hour-isaiah658_0.mp3'],
]) {
  await download(url, name);
  const output = name.replace('.mp3', '-balanced.mp3');
  execFileSync(ffmpeg, ['-hide_banner','-loglevel','error','-i',path.join(originals,name),
    '-af','loudnorm=I=-18:TP=-2:LRA=9','-c:a','libmp3lame','-b:a','160k','-ar','44100','-map_metadata','-1','-y',path.join(root,`public/sounds/radio/${output}`)]);
}
await fs.writeFile(path.resolve(root, '../research/cc0-imports.json'), JSON.stringify(records,null,2));
console.log(records.map(r=>`${r.name}: ${r.bytes} bytes`).join('\n'));
