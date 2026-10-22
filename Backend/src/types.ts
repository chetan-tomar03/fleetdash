export interface TelemetryPoint {
  vehicleId: number;
  lat: number;
  lng: number;
  speed: number;
  timestamp: number;
}

export interface ParseJob {
  id: number;
  payload: unknown;
}

export interface ParseResult {
  id: number;
  points: TelemetryPoint[];
  rejected: number;
}