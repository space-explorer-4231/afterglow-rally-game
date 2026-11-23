import { readFile, writeFile, readdir } from 'node:fs/promises';

const dir = new URL('../public/models/vehicles/', import.meta.url);
const rows=[];
for (const name of await readdir(dir)) {
 if (!name.endsWith('.glb') || name.endsWith('_opt.glb')) continue;
 const b=await readFile(new URL(name,dir)); const n=b.readUInt32LE(12); const j=JSON.parse(b.subarray(20,20+n).toString());
 let vertices=0, triangles=0; for(const m of j.meshes??[]) for(const p of m.primitives) { vertices+=j.accessors[p.attributes.POSITION]?.count??0; triangles+=(p.indices===undefined ? j.accessors[p.attributes.POSITION]?.count : j.accessors[p.indices]?.count)/3; }
 rows.push({name,bytes:b.length,vertices,triangles,images:j.images?.length??0,extensions:j.extensionsRequired??[]});
}
console.log(JSON.stringify(rows,null,2));
await writeFile(new URL('../../research/asset-audit-before.json',import.meta.url),JSON.stringify(rows,null,2));
