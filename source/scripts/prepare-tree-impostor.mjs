/** Pack the eight actual CC0 model renders into a lossless RGBA distance-LOD atlas. */
import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';
const game=path.resolve(import.meta.dirname,'../..');
const root=path.join(game,'assets/aeroline/graphics-1.17/tree-impostor');
const destination=path.join(game,'OpenRally/public/textures/coastal');
const frames=Array.from({length:8},(_,i)=>({input:path.join(root,`view-${i}.png`),left:(i%4)*256,top:Math.floor(i/4)*256}));
await sharp({create:{width:1024,height:512,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(frames).webp({lossless:true,effort:4}).toFile(path.join(destination,'coastal-tree-atlas.webp'));
await fs.copyFile(path.join(root,'layout.json'),path.join(destination,'coastal-tree-atlas.json'));
console.log('Eight-angle photographic tree LOD atlas saved.');
