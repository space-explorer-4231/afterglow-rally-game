import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';

const root = fileURLToPath(new URL('../', import.meta.url));
const manifest = JSON.parse(fs.readFileSync(path.join(root,'source-assets/manifest.json'),'utf8'));
// The existing unpacker checks archive SHA-256 hashes and extraction paths.
execFileSync(process.execPath,[path.join(root,'unpack.cjs')],{cwd:root,stdio:'inherit'});
const publicRoot = path.join(root,'source/public');
let count=0;
for(const entry of manifest.files){
  const relative=entry.path;
  if(typeof relative!=='string'||relative.includes('\\')||relative.split('/').some(part=>!part||part==='..'||part==='.')||path.isAbsolute(relative))throw Error('Unsafe asset path');
  const overlay=path.join(root,'source-assets',relative);
  const input=fs.existsSync(overlay)?overlay:path.join(root,'OpenRally/dist',relative);
  const bytes=fs.readFileSync(input);
  if(createHash('sha256').update(bytes).digest('hex')!==entry.sha256)throw Error('Asset checksum mismatch: '+relative);
  const output=path.join(publicRoot,relative);
  fs.mkdirSync(path.dirname(output),{recursive:true});
  fs.writeFileSync(output,bytes);
  count++;
}
console.log(`Prepared ${count} verified assets for source ${manifest.version}. Media retains its separate licenses; see docs/ASSET-LICENSING.md.`);
