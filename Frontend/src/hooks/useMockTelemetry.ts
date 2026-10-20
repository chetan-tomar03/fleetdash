import { useEffect } from 'react';
import { MockFleet } from '../lib/mockFleet';
import { telemetryStore } from '../store/telemetryStore';

// Development fallback: creates fake binary frames and pushes them through
// the SAME store path the real socket uses.
export function useMockTelemetry(enabled: boolean, vehicleCount: number, hz: number): void {
  useEffect(() => {
    if (!enabled) return;

    telemetryStore.reset();
    const fleet = new MockFleet(vehicleCount);
    telemetryStore.applyFrame(fleet.toFrame());

    const intervalMs = Math.max(10, Math.round(1000 / hz));
    let last = performance.now();

    const id = window.setInterval(() => {
      const now = performance.now();
      fleet.step((now - last) / 1000);
      last = now;
      telemetryStore.applyFrame(fleet.toFrame());
    }, intervalMs);

    return () => window.clearInterval(id);
  }, [enabled, vehicleCount, hz]);
}