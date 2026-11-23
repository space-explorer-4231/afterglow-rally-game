import {expect,it} from 'vitest';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {readFileSync} from 'node:fs';
import {getVehiclePreset,getAvailableVehicles} from '../vehicleRegistry';
import {validateVehicleConfig} from '@/utils/validation/vehicleValidator';
import {parseClientMessage} from '../../../server/src/packetValidator';

it('loads the detailed BMW with paint, finite authored normals and preserved UVs',async()=>{
  const car=getVehiclePreset('bmw_m3_drift');
  const file='public'+car.modelPath;
  expect(readFileSync(file).length).toBeLessThan(2500000);
  const document=await new NodeIO().registerExtensions(ALL_EXTENSIONS).read(file);
  expect(document.getRoot().listMaterials().some(m=>m.getName()==='Body_Color')).toBe(true);
  expect(document.getRoot().listMeshes().length).toBeGreaterThan(20);
  for(const mesh of document.getRoot().listMeshes())for(const p of mesh.listPrimitives()){
    const positions=p.getAttribute('POSITION')!,normals=p.getAttribute('NORMAL')!;
    expect(normals.getCount()).toBe(positions.getCount());
    expect(Array.from(normals.getArray()!).every(Number.isFinite)).toBe(true);
    expect(p.getAttribute('TEXCOORD_0')).not.toBeNull();
  }
  expect(readFileSync('public/models/vehicles/BMW-M3-LICENSE.txt','utf8')).toContain('Tyler_Dave');
  expect(parseClientMessage({type:'join_room',roomId:'ABC123',nickname:'Drifter',vehicleId:car.id})).toMatchObject({vehicleId:car.id});
  expect(car.stats.driveType).toBe('RWD');
  expect(car.config.powerSlide).toBeDefined();
  expect(getAvailableVehicles().filter(v=>v.config.powerSlide)).toHaveLength(1);
});

it('gives every car a valid live handling profile with meaningful fast-fleet tradeoffs',()=>{
  for(const car of getAvailableVehicles()){
    expect(car.config.contactHandling).toBeDefined();
    expect(validateVehicleConfig(car.config).valid).toBe(true);
  }
  const bmw=getVehiclePreset('bmw_m3_drift').config;
  for(const id of ['voltline_xr','ironclad_sprint','parcel_gt']){
    const config=getVehiclePreset(id).config;
    expect(config.chassisMass).toBeGreaterThan(bmw.chassisMass);
    expect(config.contactHandling!.brakeStrength).toBeLessThan(bmw.contactHandling!.brakeStrength);
    expect(config.contactHandling!.steeringResponse).toBeLessThan(bmw.contactHandling!.steeringResponse);
  }
  expect(validateVehicleConfig({...bmw,contactHandling:{...bmw.contactHandling!,rearGrip:NaN}}).valid).toBe(false);
  expect(validateVehicleConfig({...bmw,powerSlide:{torqueMultiplier:Infinity,steeringSpeedReference:99,yawDamping:NaN}}).valid).toBe(false);
});
