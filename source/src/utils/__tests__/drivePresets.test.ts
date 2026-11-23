import {describe,it,expect,beforeEach,afterEach,vi} from 'vitest';
import {useSettingsStore} from '@/store/settingsStore';
import {applyEasyDriving,applySmoothGraphics} from '../drivePresets';
import {getDefaultSettings} from '@/store/settingsStore';

describe('Playtest quick setup',()=>{
  beforeEach(()=>useSettingsStore.setState({...getDefaultSettings(false),sfxVolume:.37}));
  afterEach(()=>vi.unstubAllGlobals());
  it('retains the explicit lighter profile on Android',()=>{
    vi.stubGlobal('navigator',{userAgent:'Android'});
    applySmoothGraphics();
    const s=useSettingsStore.getState();
    expect(s.resolutionScale).toBe(.85);expect(s.antiAliasing).toBe('off');expect(s.targetFps).toBe(60);
  });
  it('restores all three assists, AWD and automatic while preserving sound and graphics',()=>{
    useSettingsStore.setState({espEnabled:false,absEnabled:true,tcsEnabled:true,transmissionMode:'manual',drivetrainMode:'RWD',graphicsQuality:'high'});
    applyEasyDriving();const s=useSettingsStore.getState();
    expect([s.espEnabled,s.absEnabled,s.tcsEnabled]).toEqual([true,true,true]);expect(s.drivetrainMode).toBe('AWD');expect(s.transmissionMode).toBe('automatic');expect(s.sfxVolume).toBe(.37);expect(s.graphicsQuality).toBe('high');
  });
  it('sets a 60 FPS performance target without changing handling or audio',()=>{
    useSettingsStore.setState({shadowsEnabled:true,postProcessingEnabled:true,espEnabled:false,drivetrainMode:'RWD'});applySmoothGraphics();const s=useSettingsStore.getState();
    expect(s.targetFps).toBe(60);expect(s.shadowsEnabled).toBe(false);expect(s.postProcessingEnabled).toBe(false);expect(s.resolutionScale).toBe(1);expect(s.antiAliasing).toBe('msaa');expect(s.dynamicResolution).toBe(false);expect(s.graphicsConfiguredByUser).toBe(true);expect(s.espEnabled).toBe(false);expect(s.drivetrainMode).toBe('RWD');expect(s.sfxVolume).toBe(.37);
  });
});
