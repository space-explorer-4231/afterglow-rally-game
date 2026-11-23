import {useSettingsStore} from '@/store/settingsStore';
import {isMobileOrAndroid} from '@/utils/device';

/** Restore the beginner driving setup without resetting records or graphics choices. */
export function applyEasyDriving():void {
  const settings=useSettingsStore.getState();
  settings.setEspEnabled(true);settings.setAbsEnabled(true);settings.setTcsEnabled(true);
  settings.setDrivetrainMode('AWD');settings.setTransmissionMode('automatic');
}

/** Explicit opt-in performance profile for returning players with expensive saved graphics. */
export function applySmoothGraphics():void {
  const settings=useSettingsStore.getState();
  settings.setGraphicsQuality('medium');settings.setTargetFps(60);
  const mobile=isMobileOrAndroid();
  settings.setDrawDistance('short');settings.setAntiAliasing(mobile?'off':'msaa');settings.setResolutionScale(mobile?.85:1);
  // Optimize expensive effects before sacrificing the desktop picture's sharpness.
  if(!mobile&&useSettingsStore.getState().dynamicResolution)settings.toggleDynamicResolution();
  if(useSettingsStore.getState().shadowsEnabled)settings.toggleShadows();
  if(useSettingsStore.getState().postProcessingEnabled)settings.togglePostProcessing();
}
