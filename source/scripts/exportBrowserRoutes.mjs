import {createServer} from 'vite';
import {writeFile} from 'node:fs/promises';
import {CatmullRomCurve3,Vector3} from 'three';
const server=await createServer({server:{middlewareMode:true},appType:'custom'});
try {
 const {getAvailableLevels}=await server.ssrLoadModule('/src/config/levelRegistry.ts');
 const {getAvailableVehicles}=await server.ssrLoadModule('/src/config/vehicleRegistry.ts');
 const routes=getAvailableLevels().map(level=>({id:level.id,name:level.name,points:new CatmullRomCurve3(level.data.track.points.map(p=>new Vector3(p.x,0,p.z)),true,'catmullrom',.5).getSpacedPoints(256).map(p=>({x:p.x,z:p.z}))}));
 await writeFile('../verification/browser-routes-1.36.0.json',JSON.stringify({cars:getAvailableVehicles().map(c=>({id:c.id,name:c.name})),routes}));
} finally {await server.close();}
