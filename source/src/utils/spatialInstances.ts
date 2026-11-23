/** Split static detailed instances into independently culled blocks without dropping any geometry. */
export function partitionSpatialInstances<T extends {x: number; z: number}>(parts: readonly T[], cellSize = 150): T[][] {
  if (!Number.isFinite(cellSize) || cellSize <= 0) throw new Error('Spatial cell size must be positive.');
  const cells = new Map<string, T[]>();
  for (const part of parts) {
    const key = `${Math.floor(part.x / cellSize)}:${Math.floor(part.z / cellSize)}`;
    const cell = cells.get(key);
    if (cell) cell.push(part); else cells.set(key, [part]);
  }
  return Array.from(cells.values());
}
