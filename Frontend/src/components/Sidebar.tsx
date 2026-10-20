import { useState } from 'react';
import { Filters } from './Filters';
import { VehicleList } from './VehicleList';
import type { ConnectionStatus, VehicleFilters } from '../types/telemetry';

interface SidebarProps {
  status: ConnectionStatus;
}

// Filter state lives HERE so typing in the search box never re-renders <App />.
export function Sidebar({ status }: SidebarProps) {
  const [filters, setFilters] = useState<VehicleFilters>({ query: '', status: 'all' });

  return (
    <aside className="sidebar">
      <h2 className="panel-title">Vehicles</h2>
      <Filters filters={filters} onChange={setFilters} />
      <VehicleList filters={filters} status={status} />
    </aside>
  );
}