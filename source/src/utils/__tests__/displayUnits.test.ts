import { afterEach, describe, expect, it, vi } from 'vitest';
import { displaySpeed, speedUnitLabel, driftSpeedRange, cruiseDistanceLabel } from '../displayUnits';
import { toggleSpeedUnit } from '../input/driveModes';
import { useSettingsStore, loadSettingsFromStorage, SETTINGS_STORAGE_KEY } from '@/store/settingsStore';
import { useGameStore } from '@/store/gameStore';

afterEach(() => { vi.unstubAllGlobals(); useSettingsStore.setState({speedUnit:'kmh'}); });
describe('driver display units', () => {
  it('uses the exact international-mile conversion in both zero and moving readouts', () => {
    expect(displaySpeed(160.9344,'mph')).toBeCloseTo(100,8);
    expect(displaySpeed(0,'mph')).toBe(0);
    expect(displaySpeed(100,'kmh')).toBe(100);
    expect(speedUnitLabel('mph')).toBe('MPH');
    expect(speedUnitLabel('kmh')).toBe('KM/H');
  });
  it('keeps driving advice and the cruise objective at the same physical speed/distance', () => {
    expect(driftSpeedRange('mph')).toBe('22–40 mph');
    expect(driftSpeedRange('kmh')).toBe('35–65 km/h');
    expect(cruiseDistanceLabel(1000,'mph')).toBe('0.62 / 0.62 mi');
    expect(cruiseDistanceLabel(1000,'kmh')).toBe('1.00 / 1 km');
  });
  it('persists the preference without changing simulation speed or existing saved choices', () => {
    let saved=JSON.stringify({sfxVolume:0.35,drivetrainMode:'RWD'});
    vi.stubGlobal('localStorage',{getItem:()=>saved,setItem:(_key:string,value:string)=>{saved=value;}});
    useSettingsStore.setState({speedUnit:'kmh'});
    const before=useGameStore.getState().speed;
    toggleSpeedUnit();
    expect(useSettingsStore.getState().speedUnit).toBe('mph');
    expect(loadSettingsFromStorage(false).speedUnit).toBe('mph');
    expect(JSON.parse(saved)).toMatchObject({sfxVolume:0.35,drivetrainMode:'RWD',speedUnit:'mph'});
    expect(useGameStore.getState().speed).toBe(before);
    toggleSpeedUnit();expect(loadSettingsFromStorage(false).speedUnit).toBe('kmh');
  });
  it('rejects invalid stored unit names and leaves the fallback available', () => {
    vi.stubGlobal('localStorage',{getItem:(key:string)=>key===SETTINGS_STORAGE_KEY?'{"speedUnit":"knots"}':null});
    expect(loadSettingsFromStorage(false).speedUnit).toBeUndefined();
  });
});
