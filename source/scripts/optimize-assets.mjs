import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { weld, simplify, textureCompress, draco, getBounds, compactPrimitive, prune } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';
import draco3d from 'draco3dgltf';
import sharp from 'sharp';
import ffmpeg from 'ffmpeg-static';
import { spawnSync } from 'node:child_process';
import { readdir, stat, writeFile, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// Rebuild only derived files. Original models and lossless music stay untouched.
const models = new URL('../public/models/vehicles/', import.meta.url);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'draco3d.decoder': await draco3d.createDecoderModule(),
  'draco3d.encoder': await draco3d.createEncoderModule(),
});
await MeshoptSimplifier.ready;
const reportURL = new URL('../../research/asset-optimization.json', import.meta.url);
const filter = process.argv[2];
const report = filter ? JSON.parse(await readFile(reportURL, 'utf8')) : [];
function triangles(doc) {
  return doc.getRoot().listMeshes().reduce((sum, mesh) => sum + mesh.listPrimitives().reduce((n, p) =>
    n + (p.getIndices()?.getCount() ?? p.getAttribute('POSITION').getCount()) / 3, 0), 0);
}
for (const name of await readdir(models)) {
  if (!name.endsWith('.glb') || name.endsWith('_opt.glb') || (filter && name !== filter)) continue;
  const source = new URL(name, models);
  const output = new URL(name.replace('.glb', '_opt.glb'), models);
  const doc = await io.read(fileURLToPath(source));
  const before = triangles(doc);
  const bounds = getBounds(doc.getRoot().listScenes()[0]);
  const wheel = name === 'wheel.glb';
  // This mesh has disconnected triangle seams; attribute-aware simplification keeps UV and normal error bounded.
  if (name === 'car_vortex_b.glb') {
    await doc.transform(weld());
    for (const mesh of doc.getRoot().listMeshes()) for (const prim of mesh.listPrimitives()) {
      const position=prim.getAttribute('POSITION'), normal=prim.getAttribute('NORMAL'), uv=prim.getAttribute('TEXCOORD_0');
      const count=position.getCount(), attributes=new Float32Array(count*5), vector=[0,0,0], texcoord=[0,0];
      for(let i=0;i<count;i++) {
        normal.getElement(i,vector); uv.getElement(i,texcoord);
        attributes.set(vector,i*5); attributes.set(texcoord,i*5+3);
      }
      const old=prim.getIndices();
      const [indices]=MeshoptSimplifier.simplifyWithAttributes(new Uint32Array(old.getArray()), new Float32Array(position.getArray()),3,
        attributes,5,[0.5,0.5,0.5,1,1],null,Math.floor(old.getCount()*0.04/3)*3,0.02,['Permissive']);
      prim.setIndices(old.clone().setArray(indices));
      compactPrimitive(prim);
    }
  }
  await doc.transform(
    weld(),
    simplify({ simplifier: MeshoptSimplifier, ratio: name === 'car_vortex_b.glb' ? 1 : wheel ? 0.008 : 0.04, error: wheel ? 0.008 : 0.005 }),
    textureCompress({ encoder: sharp, targetFormat: 'webp', resize: wheel ? [512, 512] : [1024, 1024], quality: 85 }),
    prune(),
    draco({ encodeSpeed: 5, decodeSpeed: 7, quantizePosition: 14, quantizeNormal: 10, quantizeTexcoord: 12 }),
  );
  await io.write(fileURLToPath(output), doc);
  // Decode the actual exported result, not just the in-memory transform.
  const decoded = await io.read(fileURLToPath(output));
  const afterBounds = getBounds(decoded.getRoot().listScenes()[0]);
  const extent = Math.max(...bounds.max.map((v, i) => v - bounds.min[i]));
  for (let i = 0; i < 3; i++) {
    if (Math.abs(afterBounds.min[i] - bounds.min[i]) > extent * 0.02 || Math.abs(afterBounds.max[i] - bounds.max[i]) > extent * 0.02)
      throw Error(`Bounds changed too far: ${name}`);
  }
  const row = { name, beforeBytes: (await stat(source)).size, afterBytes: (await stat(output)).size,
    beforeTriangles: before, afterTriangles: triangles(decoded), boundsPreserved: true,
    textures: decoded.getRoot().listTextures().map(t => t.getSize()) };
  const previous=report.findIndex(r=>r.name===name); if(previous>=0) report.splice(previous,1); report.push(row);
  console.log(JSON.stringify(row));
}
for (const name of filter ? [] : ['afterglow-drive', 'redline-horizon']) {
  const source = fileURLToPath(new URL(`../public/sounds/original/${name}.wav`, import.meta.url));
  const output = source.replace('.wav', '.mp3');
  const result = spawnSync(ffmpeg, ['-y', '-v', 'error', '-i', source, '-codec:a', 'libmp3lame', '-b:a', '128k', '-ar', '44100', output], { windowsHide: true, encoding: 'utf8' });
  if (result.status !== 0) throw Error(result.stderr || 'Music encoding failed');
  report.push({ name: name + '.mp3', beforeBytes: (await stat(source)).size, afterBytes: (await stat(output)).size });
}
await writeFile(new URL('../../research/asset-optimization.json', import.meta.url), JSON.stringify(report, null, 2));
