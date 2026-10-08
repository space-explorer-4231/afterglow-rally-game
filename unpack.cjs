const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const root = __dirname;
const manifest = JSON.parse(fs.readFileSync(path.join(root,'asset-manifest.json'),'utf8'));
for (const archive of manifest.archives) {
  if (!/^game-\d{3}\.tar\.gz$/.test(archive.filename)) throw Error('Unexpected archive name');
  const file=path.join(root,archive.filename);
  const hash=crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  if(hash!==archive.sha256) throw Error('Archive integrity check failed: '+archive.filename);
  const names=execFileSync('tar',['-tzf',file],{encoding:'utf8'}).trim().split(/\r?\n/);
  if(names.some(name=>(!name.startsWith('OpenRally/dist/')&&!name.startsWith('OpenRally/server/dist/'))||name.includes('\\')||name.split('/').includes('..'))) throw Error('Invalid archive path');
  execFileSync('tar',['-xzf',file,'-C',root],{stdio:'inherit'});
}
for (const file of ['OpenRally/dist/index.html','OpenRally/server/dist/server.js']) {
  if(!fs.existsSync(path.join(root,file))) throw Error('Incomplete game build: '+file);
}
console.log('AEROLINE '+manifest.version+' ready.');
