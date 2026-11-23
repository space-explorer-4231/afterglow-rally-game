import {describe,it,expect} from 'vitest';
import {fileURLToPath} from 'node:url';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {MeshoptDecoder} from 'meshoptimizer';
import sharp from 'sharp';

describe('Photographed foliage cutouts',()=>{
  for(const suffix of ['', '-mobile'])it(`retains the authored shrub opacity mask ${suffix||'desktop'}`,async()=>{
    await MeshoptDecoder.ready;
    const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});
    const url=new URL(`../../../public/models/coastal/shrub_01${suffix}.glb`,import.meta.url);
    const doc=await io.read(fileURLToPath(url));
    const material=doc.getRoot().listMaterials()[0];
    expect(material.getAlphaMode()).toBe('MASK');
    const texture=material.getBaseColorTexture();
    if(!texture?.getImage())throw new Error('Foliage base color is missing');
    const image=sharp(Buffer.from(texture.getImage()!));
    expect((await image.metadata()).hasAlpha).toBe(true);
    const alpha=(await image.stats()).channels[3];
    expect(alpha.min).toBe(0);
    expect(alpha.max).toBe(255);
    // The creator's mask covers about 42% of its atlas. An opaque JPEG or an
    // accidentally empty mask must fail, including after mobile resampling.
    expect(alpha.mean/255).toBeGreaterThan(.39);
    expect(alpha.mean/255).toBeLessThan(.44);
  });
});
