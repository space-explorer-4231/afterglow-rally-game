import { useGameStore } from '@/store/gameStore';
import { useSettingsStore } from '@/store/settingsStore';
import { expect, it } from 'vitest';
import { NodeIO } from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import { readFileSync } from 'node:fs';
import { SPEED_FLEET } from '../vehicles/speedFleet';
import { parseClientMessage } from '../../../server/src/packetValidator';
import { validateVehicleConfig } from '@/utils/validation/vehicleValidator';
it('loads all five small, distinct body meshes with usable paint, normals and four wheel configurations', async () => {
  const hashes = new Set<string>();
  for (const preset of SPEED_FLEET) {
    const file = 'public'+preset.modelPath, bytes = readFileSync(file);
    hashes.add(bytes.toString('base64')); expect(bytes.length).toBeLessThan(4000000);
    const io=new NodeIO().registerExtensions(ALL_EXTENSIONS);
    const document = await io.read(file), meshes = document.getRoot().listMeshes();
    expect(meshes.length).toBeLessThanOrEqual(20); expect(document.getRoot().listMaterials().some(m=>m.getName()==='Body_Color')).toBe(true);
    for (const mesh of meshes) for (const primitive of mesh.listPrimitives()) {
      const positions = primitive.getAttribute('POSITION')!, normals = primitive.getAttribute('NORMAL')!;
      expect(positions.getCount()).toBeGreaterThan(0); expect(normals.getCount()).toBe(positions.getCount());
      expect(Array.from(positions.getArray()!).every(Number.isFinite)).toBe(true);
    }
    expect(preset.config.wheels).toHaveLength(4); expect(preset.optimizedModelPath).not.toBe(preset.modelPath);
    const optimized=await io.read('public'+preset.optimizedModelPath);
    expect(readFileSync('public'+preset.optimizedModelPath).length).toBeLessThan(2000000);
    const triangles=optimized.getRoot().listMeshes().reduce((total,mesh)=>total+mesh.listPrimitives().reduce((sum,p)=>sum+(p.getIndices()?.getCount()??0)/3,0),0);
    expect(triangles).toBeLessThan(50000);
    expect(optimized.getRoot().listAnimations()).toHaveLength(0);
    expect(validateVehicleConfig(preset.config).valid).toBe(true);
    const cabin = preset.config.cabinCollider!;
    expect(cabin.centerY-cabin.halfHeight).toBeCloseTo(-.16);
    expect(cabin.centerY+cabin.halfHeight).toBeGreaterThan(.75);
    const joined = parseClientMessage({type:'join_room',roomId:'ABC123',nickname:'Driver',vehicleId:preset.id});
    expect(joined).toMatchObject({vehicleId:preset.id});
  }
  expect(hashes.size).toBe(5);
});
it('rejects invalid custom roof envelopes rather than allowing collision holes', () => {
  const config = SPEED_FLEET[0].config;
  expect(validateVehicleConfig({...config,cabinCollider:{centerY:NaN,centerZ:0,halfHeight:-1,length:2}}).valid).toBe(false);
});

it('equips a new fleet car with its drivetrain and preserves an explicit mode change on the same car', () => {
  useGameStore.setState({selectedVehicleId:'zephyr_wr4'});
  useGameStore.getState().setSelectedVehicleId('nightfall_v8');expect(useSettingsStore.getState().drivetrainMode).toBe('RWD');
  useSettingsStore.getState().setDrivetrainMode('FWD');
  useGameStore.getState().setSelectedVehicleId('nightfall_v8');expect(useSettingsStore.getState().drivetrainMode).toBe('FWD');
  useGameStore.getState().setSelectedVehicleId('meridian_rs');expect(useSettingsStore.getState().drivetrainMode).toBe('AWD');
});
