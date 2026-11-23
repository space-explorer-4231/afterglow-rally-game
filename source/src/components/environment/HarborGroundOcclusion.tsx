import {useEffect,useMemo} from 'react';
import {useSettingsStore} from '@/store/settingsStore';
import {createGroundOcclusionResources,harborGroundFootprints} from '@/utils/harborGroundOcclusion';

/** Analytic near-ground shading is independent of expensive shadow-map quality. */
export function HarborGroundOcclusion({heights}:{heights:readonly number[]}){
  const shadows=useSettingsStore(s=>s.shadowsEnabled);
  const resources=useMemo(()=>createGroundOcclusionResources(harborGroundFootprints(heights),shadows?.65:1),[heights,shadows]);
  useEffect(()=>()=>resources.dispose(),[resources]);
  return <primitive object={resources.group}/>;
}
