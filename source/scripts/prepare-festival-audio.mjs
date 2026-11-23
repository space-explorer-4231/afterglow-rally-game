import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync,spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),ffmpeg=require('ffmpeg-static');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),dir=path.join(root,'public/audio/festival');
const originals=path.join(root,'asset-sources/festival-1.32');fs.mkdirSync(originals,{recursive:true});
const manifest=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json')));
for(const item of manifest){
 const source=path.join(originals,item.id+'.mp3'),target=path.join(dir,item.id+'.mp3');
 if(!fs.existsSync(source))fs.copyFileSync(target,source);
 const sourceBytes=fs.readFileSync(source);item.sourceBytes=sourceBytes.length;item.sourceSha256=crypto.createHash('sha256').update(sourceBytes).digest('hex');
 if(item.encoding!=='MP3 160 kbps; original timing and pitch')execFileSync(ffmpeg,['-hide_banner','-loglevel','error','-y','-i',source,'-map','0:a:0','-c:a','libmp3lame','-b:a','160k','-map_metadata','0',target],{windowsHide:true});
 const decoded=spawnSync(ffmpeg,['-hide_banner','-i',target,'-af','volumedetect','-f','null','-'],{windowsHide:true,encoding:'utf8',stdio:['ignore','pipe','pipe']});
 if(decoded.status!==0)throw Error('Audio decode failed: '+item.id);
 const duration=decoded.stderr.match(/Duration: (\d+):(\d+):([\d.]+)/);
 if(!duration)throw Error('Missing duration: '+item.id);
 item.durationSeconds=Number(duration[1])*3600+Number(duration[2])*60+Number(duration[3]);
 item.peakDb=Number(decoded.stderr.match(/max_volume: ([-\d.]+) dB/)?.[1]);
 if(!Number.isFinite(item.peakDb)||item.durationSeconds<120)throw Error('Truncated or invalid audio: '+item.id);
 const bytes=fs.readFileSync(target);item.bytes=bytes.length;item.sha256=crypto.createHash('sha256').update(bytes).digest('hex');item.encoding='MP3 160 kbps; original timing and pitch';
 // A full successful decode is the media integrity check; no recordings are synthesized.
 console.log(item.id+': full decode passed, '+bytes.length+' bytes');
}
fs.writeFileSync(path.join(dir,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log('Total delivery bytes: '+manifest.reduce((n,item)=>n+item.bytes,0));
