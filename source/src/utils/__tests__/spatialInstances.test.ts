import {it, expect} from 'vitest';
import {partitionSpatialInstances} from '../spatialInstances';
it('preserves every instance exactly once, including cells across negative coordinates', () => {
  const parts=Array.from({length:1000},(_,i)=>({x:(i%10-5)*80,z:(Math.floor(i/10)-50)*20,id:i}));
  const cells=partitionSpatialInstances(parts);
  expect(cells.flat().map(p=>p.id).sort((a,b)=>a-b)).toEqual(parts.map(p=>p.id));
  for(const cell of cells) {
    expect(new Set(cell.map(p=>Math.floor(p.x/150))).size).toBe(1);
    expect(new Set(cell.map(p=>Math.floor(p.z/150))).size).toBe(1);
  }
});
it('rejects invalid culling sizes and handles empty batches',()=>{
  expect(partitionSpatialInstances([])).toEqual([]);
  for(const size of [0,-1,NaN,Infinity]) expect(()=>partitionSpatialInstances([],size)).toThrow();
});
