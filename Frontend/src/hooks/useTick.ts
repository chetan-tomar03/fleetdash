import { useEffect, useState } from 'react';

// Re-renders the calling component every `intervalMs` milliseconds.
export function useTick(intervalMs: number): number {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setTick((value) => value + 1), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);

  return tick;
}