import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { point, polygon } from "@turf/helpers";
import { EventEmitter } from "events";
import Geofence, { GeoJSONPolygon } from "../models/Geofence";
import GeofenceAlert, { BreachType } from "../models/GeofenceAlert";

export interface BreachAlert {
  vehicleId: string;
  geofenceId: string;
  timestamp: Date;
  latitude: number;
  longitude: number;
  type: BreachType;
}

interface CachedGeofence {
  id: string;
  geometry: GeoJSONPolygon;
}

interface Position {
  vehicleId: string;
  latitude: number;
  longitude: number;
  timestamp?: string | number | Date;
}

const cacheTtlMs = Number(process.env.GEOFENCE_CACHE_TTL_MS) || 5000;
const geofenceEvents = new EventEmitter();
const vehicleStates = new Map<string, boolean>();
let cachedGeofences: CachedGeofence[] = [];
let cacheExpiresAt = 0;
let refreshPromise: Promise<CachedGeofence[]> | null = null;

async function getActiveGeofences(): Promise<CachedGeofence[]> {
  if (Date.now() < cacheExpiresAt) return cachedGeofences;
  if (refreshPromise) return refreshPromise;

  refreshPromise = Geofence.find({ active: true })
    .lean()
    .exec()
    .then((geofences) => {
      cachedGeofences = geofences.map((geofence) => ({
        id: String(geofence._id),
        geometry: geofence.geometry,
      }));
      cacheExpiresAt = Date.now() + cacheTtlMs;
      return cachedGeofences;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

function normalizePositions(telemetry: unknown): Position[] {
  const values = Array.isArray(telemetry) ? telemetry : [telemetry];
  return values.filter((value): value is Position => {
    if (typeof value !== "object" || value === null) return false;
    const position = value as Record<string, unknown>;
    return (
      typeof position.vehicleId === "string" &&
      typeof position.latitude === "number" &&
      typeof position.longitude === "number"
    );
  });
}

export async function checkGeofenceBreaches(telemetry: unknown): Promise<void> {
  const positions = normalizePositions(telemetry);
  if (positions.length === 0) return;

  const geofences = await getActiveGeofences();
  const alerts: BreachAlert[] = [];

  for (const position of positions) {
    const timestamp = position.timestamp ? new Date(position.timestamp) : new Date();
    for (const geofence of geofences) {
      const stateKey = `${position.vehicleId}:${geofence.id}`;
      const inside = booleanPointInPolygon(
        point([position.longitude, position.latitude]),
        polygon(geofence.geometry.coordinates)
      );
      const previous = vehicleStates.get(stateKey);
      vehicleStates.set(stateKey, inside);

      if (previous === undefined || previous === inside) continue;

      alerts.push({
        vehicleId: position.vehicleId,
        geofenceId: geofence.id,
        timestamp,
        latitude: position.latitude,
        longitude: position.longitude,
        type: inside ? "enter" : "exit",
      });
    }
  }

  if (alerts.length === 0) return;

  await GeofenceAlert.insertMany(alerts);
  alerts.forEach((alert) => geofenceEvents.emit("breach", alert));
}

export function onGeofenceBreach(listener: (alert: BreachAlert) => void): void {
  geofenceEvents.on("breach", listener);
}
