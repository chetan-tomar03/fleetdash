import { useEffect, useState } from 'react';
import { telemetryStore } from '../store/telemetryStore';
import { renderCounts } from '../lib/renderProbe';
import type { TelemetryStats } from '../types/telemetry';

const INITIAL_STATS: TelemetryStats = {
  framesPerSec: 0,
  recordsPerSec: 0,
  vehicles: 0,
  droppedFrames: 0,
  appRenders: 0,
};

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

// Samples the store once per interval (default 1 second).
// Only the component calling this hook re-renders, not the whole app.
export function useTelemetryStats(intervalMs = 1000): TelemetryStats {
  const [stats, setStats] = useState<TelemetryStats>(INITIAL_STATS);

  useEffect(() => {
    let lastFrames = telemetryStore.framesReceived;
    let lastRecords = telemetryStore.recordsReceived;
    let lastTime = performance.now();

    const id = window.setInterval(() => {
      const now = performance.now();
      const seconds = (now - lastTime) / 1000;
      const frames = telemetryStore.framesReceived;
      const records = telemetryStore.recordsReceived;

      setStats({
        framesPerSec: round1(Math.max(0, frames - lastFrames) / seconds),
        recordsPerSec: Math.round(Math.max(0, records - lastRecords) / seconds),
        vehicles: telemetryStore.count,
        droppedFrames: telemetryStore.droppedFrames,
        appRenders: renderCounts.app,
      });

      lastFrames = frames;
      lastRecords = records;
      lastTime = now;
    }, intervalMs);

    return () => window.clearInterval(id);
  }, [intervalMs]);

  return stats;
}