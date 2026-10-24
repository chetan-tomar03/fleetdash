import { Bell, ChevronDown, Search } from 'lucide-react';
import { ConnectionBadge } from '../ConnectionBadge';
import { CURRENT_USER } from '../../data/dashboardMock';
import type { ConnectionStatus } from '../../types/telemetry';

interface TopBarProps {
  status: ConnectionStatus;
}

export function TopBar({ status }: TopBarProps) {
  return (
    <header className="fd-topbar">
      <label className="fd-search">
        <Search size={18} aria-hidden="true" />
        <input
          type="search"
          placeholder="Search vehicles, drivers, or routes..."
          aria-label="Search vehicles, drivers, or routes"
        />
      </label>

      <div className="fd-topbar__right">
        <ConnectionBadge status={status} />
        <button type="button" className="fd-icon-btn" aria-label="Notifications">
          <Bell size={20} aria-hidden="true" />
          <span className="fd-icon-btn__dot" />
        </button>
        <button type="button" className="fd-user">
          <span className="fd-user__avatar">{CURRENT_USER.initials}</span>
          <span className="fd-user__meta">
            <strong>{CURRENT_USER.name}</strong>
            <small>{CURRENT_USER.role}</small>
          </span>
          <ChevronDown size={16} aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}