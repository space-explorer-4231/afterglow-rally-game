import { describe, it, expect } from 'vitest';
import { LEVEL1_DATA } from '@/config/level1';
import { LEVEL5_GYMKHANA_DATA } from '@/config/levels/gymkhanaIsland';
import { LEVEL4_BRITAIN_DATA } from '@/config/levels/highlandCastle';
import { compileTerrain } from '@/utils/terrainCompiler';
import { categorizeProps, usePropsData } from '../usePropsData';

describe('categorizeProps & usePropsData', () => {
  it('keeps stacked district containers above the pavement and synchronizes collider transforms', () => {
    const result = categorizeProps(compileTerrain(LEVEL5_GYMKHANA_DATA), LEVEL5_GYMKHANA_DATA);
    const stacked = result.shippingContainers.filter(p =>
      LEVEL5_GYMKHANA_DATA.props.find(source => source.id === p.id)?.position[1] === 2.7);
    expect(stacked.length).toBeGreaterThan(0);
    for (const top of stacked) {
      const base = result.shippingContainers.find(p => p.id !== top.id && p.position[0] === top.position[0] && p.position[2] === top.position[2]);
      expect(base).toBeDefined();
      expect(top.position[1]).toBeGreaterThan(9);
      expect(top.position[1] - base!.position[1]).toBeCloseTo(2.7);
      expect(top.matrix.elements[13]).toBeCloseTo(top.position[1]);
      expect([...result.spatialGrid.values()].some(cell => cell.includes(top))).toBe(true);
    }
  });
  it('correctly categorizes props into structured collections and populates spatialGrid for Island Circuit', () => {
    const heightmapData = compileTerrain(LEVEL1_DATA);
    const result = categorizeProps(heightmapData, LEVEL1_DATA);

    expect(result).toBeDefined();
    expect(result.pineTrees).toBeInstanceOf(Array);
    expect(result.rocks).toBeInstanceOf(Array);
    expect(result.cabins).toBeInstanceOf(Array);
    expect(result.fences).toBeInstanceOf(Array);
    expect(result.spatialGrid).toBeInstanceOf(Map);

    // Verify matrix validity on props
    if (result.pineTrees.length > 0) {
      const tree = result.pineTrees[0];
      expect(tree.matrix).toBeDefined();
      expect(tree.position.length).toBe(3);
      expect(Number.isFinite(tree.position[1])).toBe(true);
    }
  });

  it('correctly categorizes advanced castle, cottage, wall, and bridge props for Highland Castle', () => {
    const heightmapData = compileTerrain(LEVEL4_BRITAIN_DATA);
    const result = categorizeProps(heightmapData, LEVEL4_BRITAIN_DATA);

    expect(result.castleTowers.length).toBeGreaterThan(0);
    expect(result.castleWalls.length).toBeGreaterThan(0);
    expect(result.stoneWalls.length).toBeGreaterThan(0);
    expect(result.highlandCottages.length).toBeGreaterThan(0);
    expect(result.standingStones.length).toBeGreaterThan(0);
    expect(result.stoneBridges).toBeInstanceOf(Array);

    // Verify multi-point ground snapping for large keep
    if (result.castleKeeps.length > 0) {
      const keep = result.castleKeeps[0];
      expect(Number.isFinite(keep.position[1])).toBe(true);
    }

    // Verify NO cottages, castle walls, or stone walls intersect the track
    const allRoadExcluded = [
      ...result.highlandCottages,
      ...result.cabins,
      ...result.castleWalls,
      ...result.castleTowers,
      ...result.castleKeeps,
      ...result.stoneWalls,
      ...result.standingStones,
    ];

    for (const prop of allRoadExcluded) {
      const nx = (prop.position[0] + LEVEL4_BRITAIN_DATA.terrainBase.width / 2) / LEVEL4_BRITAIN_DATA.terrainBase.width;
      const nz = (prop.position[2] + LEVEL4_BRITAIN_DATA.terrainBase.depth / 2) / LEVEL4_BRITAIN_DATA.terrainBase.depth;
      const x = Math.floor(nx * (heightmapData.cols - 1));
      const z = Math.floor(nz * (heightmapData.rows - 1));
      const maskVal = heightmapData.trackMasks[z * heightmapData.cols + x];
      expect(maskVal, `Prop ${prop.id} of type ${prop.type} at (${prop.position[0]}, ${prop.position[2]}) intersects track with mask ${maskVal}`).toBe(0);
    }
  });

  it('exports usePropsData hook function', () => {
    expect(typeof usePropsData).toBe('function');
  });
});
