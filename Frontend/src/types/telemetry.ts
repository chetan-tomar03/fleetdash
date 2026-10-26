export type ConnectionStatus =
  | 'mock'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'error';

export interface VehiclePosition {
  id: number;
  lat: number;
  lng: number;
  speed: number; // km/h
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