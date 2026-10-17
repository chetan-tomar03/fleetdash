import { MAX_LIST_ROWS } from '../config/constants';
import { useTick } from '../hooks/useTick';
import { isMoving, vehicleName } from '../lib/vehicle';
import { telemetryStore } from '../store/telemetryStore';
import type { ConnectionStatus, VehicleFilters, VehiclePosition } from '../types/telemetry';

interface VehicleListProps {
  filters: VehicleFilters;
  status: ConnectionStatus;
}

export function VehicleList({ filters, status }: VehicleListProps) {
  // Refresh once per second (NOT once per message).
  useTick(1000);

  const query = filters.query.trim().toLowerCase();
  const rows: VehiclePosition[] = [];
  let matches = 0;

  for (let slot = 0; slot < telemetryStore.count; slot++) {
    const speed = telemetryStore.speeds[slot];
    const moving = isMoving(speed);
    if (filters.status === 'moving' && !moving) continue;
    if (filters.status === 'idle' && moving) continue;

    const id = telemetryStore.ids[slot];
    if (query && !vehicleName(id).toLowerCase().includes(query)) continue;

    matches += 1;
    if (rows.length < MAX_LIST_ROWS) {
      rows.push({
        id,
        lat: telemetryStore.lats[slot],
        lng: telemetryStore.lngs[slot],
        speed,
      });
    }
  }

  // Error state
  if (status === 'error' && telemetryStore.count === 0) {
    return (
      <div className="state state-error">
        Cannot reach the telemetry server. Retrying automatically…
      </div>
    );
  }

  // Loading state
  if (telemetryStore.count === 0) {
    return <div className="state">Waiting for telemetry data…</div>;
  }

  // Empty state
  if (matches === 0) {
    return <div className="state">No vehicles match your filters.</div>;
  }

  // Success state
  return (
    <div className="vehicle-list-wrap">
      <p className="list-count">
        Showing {rows.length} of {matches} vehicles
      </p>
      <ul className="vehicle-list">
        {rows.map((vehicle) => (
          <li key={vehicle.id} className="vehicle-row">
            <div>
              <strong>{vehicleName(vehicle.id)}</strong>
              <div className="muted">
                {vehicle.lat.toFixed(4)}, {vehicle.lng.toFixed(4)}
              </div>
            </div>
            <span className={`pill ${isMoving(vehicle.speed) ? 'pill-moving' : 'pill-idle'}`}>
              {isMoving(vehicle.speed) ? `${Math.round(vehicle.speed)} km/h` : 'Idle'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}