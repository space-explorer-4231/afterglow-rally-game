import { useEffect } from 'react';
import { useRestartStore } from '@/store/restartStore';
export function RestartConfirmation() {
  const deadline = useRestartStore(s => s.deadline);
  useEffect(() => {
    if (!deadline) return;
    const timer = window.setTimeout(() => useRestartStore.getState().setDeadline(0), Math.max(0, deadline - performance.now()));
    return () => window.clearTimeout(timer);
  }, [deadline]);
  if (!deadline) return null;
  return <div role="status" style={{ position: 'absolute', top: '24%', left: '50%', transform: 'translateX(-50%)',
    background: 'rgba(10,20,30,.94)', border: '1px solid #7dd3fc', borderRadius: 12, padding: '14px 22px', color: '#f0f9ff',
    fontWeight: 700, zIndex: 120, pointerEvents: 'none', textAlign: 'center' }}>
    Press R again to reset<br/><small style={{ fontWeight: 400, color: '#b9cddd' }}>Within 2 seconds · expires automatically</small>
  </div>;
}
