import type { GeofenceAlert } from '../types/telemetry';

// Sample data only. Real alerts arrive in Week 3 via the backend.
export const MOCK_ALERTS: GeofenceAlert[] = [
  {
    id: 'a1',
    vehicleId: 1042,
    zoneName: 'Warehouse Zone A',
    severity: 'critical',
    occurredAt: '2026-10-18T09:15:00.000Z',
  },
  {
    id: 'a2',
    vehicleId: 207,
    zoneName: 'City Centre Restricted',
    severity: 'warning',
    occurredAt: '2026-10-18T09:12:30.000Z',
  },
  {
    id: 'a3',
    vehicleId: 2310,
    zoneName: 'Depot North',
    severity: 'warning',
    occurredAt: '2026-10-18T09:08:10.000Z',
  },
];