import { useCallback, useEffect, useState } from 'react';
import { setHapticsEnabled, setSoundEnabled } from '../audio/sfx';
import { loadProgress, saveProgress, type Progress } from '../core/progress';

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Progress state persisted to localStorage on every change. */
export function useProgress() {
  const [progress, setProgress] = useState<Progress>(() => loadProgress(storage()));

  useEffect(() => {
    saveProgress(storage(), progress);
    setSoundEnabled(progress.settings.sound);
    setHapticsEnabled(progress.settings.haptics);
  }, [progress]);

  const update = useCallback((fn: (p: Progress) => Progress) => setProgress((p) => fn(p)), []);
  return [progress, update] as const;
}
