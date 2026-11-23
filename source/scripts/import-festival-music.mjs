import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
// Project owner confirmed game-use permission on 2026-10-20. No Spotify extraction.
const tracks=[
 ['on-and-on','On & On','Cartoon, Jéja, Daniel Levi','OnandOn'],
 ['cradles','Cradles','Sub Urban','Cradles'],
 ['royalty','Royalty','Egzod, Maestro Chives, Neoni','Royalty'],
 ['mortals-slowed','Mortals (Slowed)','Warriyo, Slowed Sounds','Mortals_Slowed'],
 ['why-we-lose','Why We Lose','Cartoon, Jéja, Coleman Trapp','WhyWeLose'],
 ['waiting','Waiting','Syn Cole, KAZHI','s_waiting'],
 ['like-a-melody','Like A Melody','Cartoon, JOZELS, KAZHI','LikeAMelody'],
 ['fearless-slowed','Fearless (Slowed)','Lost Sky, Slowed Sounds','Fearless_SL'],
 ['shine-slowed','Shine (Slowed)','Spektrem, Slowed Sounds','Shine_SL'],
 ['fight-in-me','Fight In Me','Egzod, Lost Sky, Alaina Cross','FightInMe'],
];
const dir=path.join(root,'public/audio/festival');fs.mkdirSync(dir,{recursive:true});
const manifest=[];
for(const[id,title,artists,slug]of tracks){
 const source='https://ncs.io/'+slug,response=await fetch(source);if(!response.ok)throw Error(source+' '+response.status);
 const html=await response.text(),audio=html.match(/id="player" data-url="([^"]+)/)?.[1];
 if(!audio||new URL(audio).hostname!=='ncsmusic.s3.eu-west-1.amazonaws.com')throw Error('No official NCS audio: '+source);
 const file=path.join(dir,id+'.mp3');let bytes;
 if(fs.existsSync(file))bytes=fs.readFileSync(file);else{const r=await fetch(audio);if(!r.ok)throw Error('Audio '+r.status);bytes=Buffer.from(await r.arrayBuffer());if(bytes.length<100000||bytes.length>20000000)throw Error('Audio size');fs.writeFileSync(file,bytes);}
 const item={id,title,artists,file:'/audio/festival/'+id+'.mp3',source,download:audio,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')};manifest.push(item);
 console.log(id+': '+bytes.length+' bytes');
}
fs.writeFileSync(path.join(dir,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
fs.writeFileSync(path.join(dir,'CREDITS.txt'),'Music provided by NoCopyrightSounds. Artist and recording credits:\n\n'+manifest.map((t,i)=>`${i+1}. ${t.title} — ${t.artists}\nFree download/stream and credit source: ${t.source}`).join('\n\n')+'\n\nNCS usage information: https://ncs.io/usage-policy\n');
fs.writeFileSync(path.join(root,'src/config/festivalPlaylist.ts'),'/** Ordered soundtrack requested by the project owner. Local media; no Spotify login. */\nexport const FESTIVAL_PLAYLIST = '+JSON.stringify(manifest.map(({id,title,artists,file,source})=>({id,title,artists,file,source})),null,2)+' as const;\n');
console.log('Imported '+manifest.length+' recordings, '+manifest.reduce((n,t)=>n+t.bytes,0)+' bytes.');
