import type { StatusFilter, VehicleFilters } from '../types/telemetry';

interface FiltersProps {
  filters: VehicleFilters;
  onChange: (next: VehicleFilters) => void;
}

export function Filters({ filters, onChange }: FiltersProps) {
  return (
    <div className="filters">
      <input
        className="input"
        type="search"
        placeholder="Search vehicle (e.g. 1042)"
        aria-label="Search vehicles"
        value={filters.query}
        onChange={(event) => onChange({ ...filters, query: event.target.value })}
      />
      <select
        className="input"
        aria-label="Filter by status"
        value={filters.status}
        onChange={(event) =>
          onChange({ ...filters, status: event.target.value as StatusFilter })
        }
      >
        <option value="all">All statuses</option>
        <option value="moving">Moving</option>
        <option value="idle">Idle</option>
      </select>
    </div>
  );
}