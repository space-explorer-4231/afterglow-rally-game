import {expect,it} from 'vitest';
import {Matrix4} from 'three';
import {partitionVegetation} from '../vegetationChunks';
import type {PropItem} from '../types';
import {getAvailableLevels} from '@/config/levelRegistry';
import {compileTerrain} from '@/utils/terrainCompiler';
import {categorizeProps} from '../usePropsData';

function tree(id:string,x:number,z:number):PropItem {
  return {id,type:'tree_pine',position:[x,0,z],rotation:[0,0,0],scale:[1,1,1],matrix:new Matrix4().makeTranslation(x,0,z)};
}

it('handles negative coordinates and exact cell boundaries without losing or copying trees',()=>{
  const items=[tree('negative',-1,-1),tree('origin',0,0),tree('edge',180,179),tree('same',1,1)];
  const chunks=partitionVegetation(items);
  expect(chunks.map(chunk=>chunk.key)).toEqual(['-1:-1','0:0','1:0']);
  expect(chunks[1].items).toEqual([items[1],items[3]]);
  expect(new Set(chunks.flatMap(chunk=>chunk.items)).size).toBe(items.length);
  expect(items.map(item=>item.id)).toEqual(['negative','origin','edge','same']);
});

it('uses actual instance transforms instead of stale placement metadata',()=>{
  const item=tree('moved',0,0);item.matrix.makeTranslation(400,0,-200);
  expect(partitionVegetation([item])[0].key).toBe('2:-2');
  expect(partitionVegetation([])).toEqual([]);
  for(const invalid of [0,-1,NaN,Infinity])expect(()=>partitionVegetation([item],invalid)).toThrow(RangeError);
});

it('preserves every categorized map tree with bounded spatial batch counts',()=>{
  const report=[];
  for(const level of getAvailableLevels()){
    const props=categorizeProps(compileTerrain(level.data),level.data);
    const species=[props.pineTrees,props.birchTrees,props.desertTrees];
    let totalChunks=0,totalTrees=0;
    for(const trees of species){
      const chunks=partitionVegetation(trees);
      expect(chunks.flatMap(chunk=>chunk.items).length).toBe(trees.length);
      expect(new Set(chunks.flatMap(chunk=>chunk.items)).size).toBe(trees.length);
      totalChunks+=chunks.length;totalTrees+=trees.length;
    }
    expect(totalChunks).toBeLessThanOrEqual(256);
    report.push({map:level.id,trees:totalTrees,chunks:totalChunks,maximumVegetationDraws:totalChunks*2});
  }
  console.info('Vegetation spatial batch inventory',JSON.stringify(report));
},60000);

