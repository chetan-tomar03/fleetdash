import type { ConnectionStatus } from '../types/telemetry';

const LABELS: Record<ConnectionStatus, string> = {
  mock: 'Mock data',
  connecting: 'Connecting…',
  connected: 'Live',
  disconnected: 'Disconnected',
  error: 'Connection error',
};

interface ConnectionBadgeProps {
  status: ConnectionStatus;
}

export function ConnectionBadge({ status }: ConnectionBadgeProps) {
  return (
    <span className={`badge badge-${status}`} role="status">
      <span className="badge-dot" />
      {LABELS[status]}
    </span>
  );
}