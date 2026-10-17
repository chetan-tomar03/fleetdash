import { ConnectionBadge } from './ConnectionBadge';
import type { ConnectionStatus } from '../types/telemetry';

interface HeaderProps {
  status: ConnectionStatus;
}

export function Header({ status }: HeaderProps) {
  return (
    <header className="header">
      <h1 className="header-title">FleetDash</h1>
      <span className="header-subtitle">Live fleet telemetry</span>
      <div className="header-spacer" />
      <ConnectionBadge status={status} />
    </header>
  );
}