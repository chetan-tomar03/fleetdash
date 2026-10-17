import type { GeofenceAlert } from '../types/telemetry';

interface AlertsPanelProps {
  alerts: GeofenceAlert[];
}

export function AlertsPanel({ alerts }: AlertsPanelProps) {
  return (
    <aside className="alerts">
      <h2 className="panel-title">Geofence alerts</h2>
      <p className="muted small">Sample data until the backend sends real alerts.</p>

      {alerts.length === 0 ? (
        <div className="state">No alerts. All vehicles are inside their zones.</div>
      ) : (
        <ul className="alert-list">
          {alerts.map((alert) => (
            <li key={alert.id} className={`alert alert-${alert.severity}`}>
              <strong>Truck-{alert.vehicleId}</strong> breached {alert.zoneName}
              <div className="muted small">
                {new Date(alert.occurredAt).toLocaleTimeString()} · {alert.severity}
              </div>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}