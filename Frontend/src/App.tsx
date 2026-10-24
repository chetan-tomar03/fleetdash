import { useEffect } from 'react';
import { MapArea } from './components/MapArea';
import { env } from './config/env';
import { useMockTelemetry } from './hooks/useMockTelemetry';
import { useTelemetrySocket } from './hooks/useTelemetrySocket';
import { renderCounts } from './lib/renderProbe';
import { DashboardPage } from './pages/DashboardPage';
import type { ConnectionStatus } from './types/telemetry';

export default function App() {
  // Count each commit of <App />. Used for the mid-review demo.
  useEffect(() => {
    renderCounts.app += 1;
  });

  // Only ONE of these two sources is active, decided by VITE_USE_MOCK.
  useMockTelemetry(env.useMock, env.mockVehicleCount, env.mockHz);
  const socketStatus = useTelemetrySocket(env.socketUrl, !env.useMock);

  const status: ConnectionStatus = env.useMock ? 'mock' : socketStatus;

  return <DashboardPage status={status} map={<MapArea />} />;
}