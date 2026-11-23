/** Asset loading progress shown by the transition overlay. */
export interface AssetProgress {
  active: boolean;
  progress: number;
}

function snapshot(source: AssetProgress): AssetProgress {
  return { active: source.active, progress: Number.isFinite(source.progress) ? Math.max(0, Math.min(100, source.progress)) : 0 };
}

/** Coalesce loading-manager bursts so image completions cannot recursively update React. */
export function watchAssetProgress(read: () => AssetProgress, emit: (value: AssetProgress) => void): () => void {
  let last = snapshot(read());
  const timer = setInterval(() => {
    const current = read();
    const progress = Number.isFinite(current.progress) ? Math.max(0, Math.min(100, current.progress)) : 0;
    if (current.active === last.active && progress === last.progress) return;
    last = { active: current.active, progress };
    emit(last);
  }, 100);
  return () => clearInterval(timer);
}
