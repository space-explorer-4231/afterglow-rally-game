import { useEffect, useState } from 'react';
import { useProgress } from '@react-three/drei';
import { watchAssetProgress, type AssetProgress } from '@/utils/assetProgress';

/** Read Drei's loading store at a bounded UI cadence instead of subscribing React per asset. */
export function useAssetProgress(): AssetProgress {
  const [progress, setProgress] = useState<AssetProgress>(() => {
    const state = useProgress.getState();
    return { active: state.active, progress: Number.isFinite(state.progress) ? state.progress : 0 };
  });
  useEffect(() => watchAssetProgress(useProgress.getState, setProgress), []);
  return progress;
}
