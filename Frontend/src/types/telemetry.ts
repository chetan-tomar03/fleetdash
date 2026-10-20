export type ConnectionStatus =
  | 'mock'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'error';

export type VehicleStatus = 'moving' | 'idle';
export type StatusFilter = 'all' | VehicleStatus;

export interface VehiclePosition {
  id: number;
  lat: number;
  lng: number;
  speed: number; // km/h
}

export interface VehicleFilters {
  query: string;
  status: StatusFilter;
}

export type AlertSeverity = 'warning' | 'critical';

export interface GeofenceAlert {
  id: string;
  vehicleId: number;
  zoneName: string;
  severity: AlertSeverity;
  occurredAt: string; // ISO date string
}

export interface TelemetryStats {
  framesPerSec: number;
  recordsPerSec: number;
  vehicles: number;
  droppedFrames: number;
  appRenders: number;
}