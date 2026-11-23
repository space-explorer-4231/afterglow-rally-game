// Offline geometric QA: CPU projection of the actual GLB meshes, not a gameplay screenshot.
import fs from 'node:fs/promises';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {PerspectiveCamera,Vector3,Color,Matrix4} from 'three';
import sharp from 'sharp';
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS);
const fleet=[['meridian_rs',1.96,2.92],['voltline_xr',2.02,2.95],['ironclad_sprint',2.08,3.05],['parcel_gt',2.02,3],['nightfall_v8',2,2.88]];
const camera=new PerspectiveCamera(35,1.6,.1,100);camera.position.set(6.5,3.8,7.5);camera.lookAt(0,.3,0);camera.updateMatrixWorld();
const light=new Vector3(-.5,1,.8).normalize();
async function polygons(file,offset=[0,0,0]){const doc=await io.read(file),faces=[];
 for(const node of doc.getRoot().listNodes())for(const primitive of node.getMesh()?.listPrimitives()??[]){
  const matrix=new Matrix4().fromArray(node.getWorldMatrix());
  const positions=primitive.getAttribute('POSITION'),indices=primitive.getIndices(),material=primitive.getMaterial(),color=material?.getBaseColorFactor()??[.5,.5,.5,1];
  const count=indices?indices.getCount():positions.getCount();
  for(let i=0;i<count;i+=3){const vertices=[];for(let j=0;j<3;j++){
   const index=indices?indices.getScalar(i+j):i+j,a=[];positions.getElement(index,a);const vertex=new Vector3(a[0],a[1],a[2]).applyMatrix4(matrix);vertex.x+=offset[0];vertex.y+=offset[1];vertex.z+=offset[2];vertices.push(vertex);}
   const normal=vertices[1].clone().sub(vertices[0]).cross(vertices[2].clone().sub(vertices[0])).normalize();
   const brightness=.5+.5*Math.max(0,normal.dot(light));
   const tint=new Color().setRGB(color[0]*brightness,color[1]*brightness,color[2]*brightness).getHexString();
   const depth=vertices.reduce((s,v)=>s+v.distanceToSquared(camera.position),0)/3;
   const points=vertices.map(v=>{v.project(camera);return ((v.x+1)*320).toFixed(2)+','+((1-v.y)*200).toFixed(2);}).join(' ');
   faces.push({depth,svg:`<polygon points="${points}" fill="#${tint}"/>`});
  }
 }return faces;
}
const tiles=[];
for(let i=0;i<fleet.length;i++){const [id,width,base]=fleet[i],faces=await polygons('public/models/vehicles/'+id+'.glb');
 for(const x of [-1,1])for(const z of [-1,1])faces.push(...await polygons('public/models/vehicles/aero_forged_wheel.glb',[x*(width-.14)/2,-.52,z*base/2]));
 faces.sort((a,b)=>b.depth-a.depth);
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400"><rect width="640" height="400" fill="#e4e7df"/><ellipse cx="320" cy="304" rx="210" ry="40" fill="#b7bfb2"/>${faces.map(f=>f.svg).join('')}<text x="20" y="30" font-size="18" font-family="sans-serif" fill="#243b30">${id}</text></svg>`;
 tiles.push({input:await sharp(Buffer.from(svg)).png().toBuffer(),left:(i%2)*640,top:Math.floor(i/2)*400});
}
const output=process.argv[2]??'fleet-preview.png';
await sharp({create:{width:1280,height:1200,channels:3,background:'#e4e7df'}}).composite(tiles).png().toFile(output);
console.log('Saved offline GLB projection:',output);
