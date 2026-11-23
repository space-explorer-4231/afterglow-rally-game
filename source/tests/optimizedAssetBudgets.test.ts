import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

interface GlbMetadata {
  accessors: Array<{ count: number }>;
  meshes: Array<{ primitives: Array<{ indices: number }> }>;
}
describe('real mobile vehicle budgets', () => {
  const directory = resolve('public/models/vehicles');
  for (const name of readdirSync(directory).filter(n => n.endsWith('_opt.glb'))) {
    it(`${name} retains a valid mesh within the shipping budget`, () => {
      const bytes=readFileSync(resolve(directory,name));
      expect(bytes.subarray(0,4).toString()).toBe('glTF');
      const data: GlbMetadata=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
      const triangles=data.meshes.reduce((sum,m)=>sum+m.primitives.reduce((n,p)=>n+data.accessors[p.indices].count/3,0),0);
      expect(triangles).toBeGreaterThan(1000);
      expect(triangles).toBeLessThan(name==='wheel_opt.glb'?20000:100000);
      expect(bytes.length).toBeLessThan(2_000_000);
      expect(bytes.length).toBeLessThan(readFileSync(resolve(directory,name.replace('_opt',''))).length*0.6);
    });
  }
});
