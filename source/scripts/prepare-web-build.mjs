import { readdir, readFile, writeFile, stat, unlink } from 'node:fs/promises';
import { brotliCompressSync, gzipSync, constants } from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../dist/', import.meta.url));
// The lossless masters stay in public/; the playable distribution streams MP3.
for (const name of ['afterglow-drive', 'redline-horizon']) {
  await stat(path.join(root, 'sounds/original', name + '.mp3'));
  await unlink(path.join(root, 'sounds/original', name + '.wav')).catch(error => { if(error.code !== 'ENOENT') throw error; });
}
let original=0, compressed=0, count=0;
for (const name of await readdir(root, { recursive: true })) {
  if (!/\.(js|css|html|json|svg|wasm|glb|hdr)$/.test(name)) continue;
  const file=path.join(root,name), bytes=await readFile(file);
  if(bytes.length<1024) continue;
  const br=brotliCompressSync(bytes, { params: { [constants.BROTLI_PARAM_QUALITY]: 8 } });
  const gz=gzipSync(bytes, {level:9});
  if(br.length >= bytes.length*0.95) continue;
  await writeFile(file+'.br',br); await writeFile(file+'.gz',gz);
  original+=bytes.length; compressed+=br.length; count++;
}
console.log(`Precompressed ${count} web files: ${original} -> ${compressed} bytes (Brotli).`);
