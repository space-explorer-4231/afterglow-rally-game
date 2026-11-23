import {createServer} from 'vite';
import {writeFileSync} from 'node:fs';
const server=await createServer({server:{middlewareMode:true},appType:'custom'});
try {
  const {LEVEL_REGISTRY}=await server.ssrLoadModule('/src/config/levelRegistry.ts');
  const courses=Object.fromEntries(Object.values(LEVEL_REGISTRY).map(level=>[level.id,{radius:Math.max(9.5,level.data.track.width+4.5)*.85,points:level.data.track.points.map(point=>[point.x,point.z])}]));
  writeFileSync('server/src/raceCourses.ts','/** Generated from client level presets by scripts/generate-race-courses.mjs. */\nexport const RACE_COURSES:Readonly<Record<string,{radius:number;points:readonly (readonly [number,number])[]}>> = '+JSON.stringify(courses,null,2)+';\n');
  console.log('Generated '+Object.keys(courses).length+' multiplayer race courses.');
}finally{await server.close();}
