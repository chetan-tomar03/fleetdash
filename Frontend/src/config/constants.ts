// Event names shared with the backend (Week 1 sync point: confirm these).
export const SOCKET_EVENTS = {
  TELEMETRY_FRAME: 'telemetry:frame', // binary ArrayBuffer
  GEOFENCE_ALERT: 'geofence:alert', // JSON, used from Week 3
} as const;

// Binary frame layout (assumption, confirm with backend):
// repeating 16-byte records: [uint32 id][float32 lat][float32 lng][float32 speed km/h]
export const FRAME_FIELDS_PER_RECORD = 4;
export const FRAME_BYTES_PER_RECORD = 16;

// A vehicle is "moving" above this speed (km/h).
export const MOVING_SPEED_THRESHOLD = 0.5;

// Vehicle list shows at most this many rows (avoids DOM overload).
export const MAX_LIST_ROWS = 100;