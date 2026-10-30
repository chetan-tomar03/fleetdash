import { parentPort } from "worker_threads";
import { performance } from "perf_hooks";

if (!parentPort) {
  throw new Error("Telemetry worker must run inside a worker thread");
}

const port = parentPort;

interface TelemetryJob {
  id: number;
  payload: unknown;
}

interface TelemetryReading {
  vehicleId: string;
  latitude: number;
  longitude: number;
  timestamp?: string | number | Date;
}

interface BucketReading {
  latitude: number;
  longitude: number;
  timestamp: Date;
}

interface BucketGroup {
  vehicleId: string;
  bucketStart: Date;
  bucketEnd: Date;
  readings: BucketReading[];
  minTime: Date;
  maxTime: Date;
}

function groupIntoBuckets(readings: TelemetryReading[]): BucketGroup[] {
  const groups = new Map<string, BucketGroup>();

  for (const reading of readings) {
    const timestamp = reading.timestamp ? new Date(reading.timestamp) : new Date();
    const bucketStart = new Date(timestamp);
    bucketStart.setUTCMinutes(0, 0, 0);
    const key = `${reading.vehicleId}|${bucketStart.getTime()}`;
    let group = groups.get(key);

    if (!group) {
      const bucketEnd = new Date(bucketStart);
      bucketEnd.setUTCHours(bucketEnd.getUTCHours() + 1);
      group = {
        vehicleId: reading.vehicleId,
        bucketStart,
        bucketEnd,
        readings: [],
        minTime: timestamp,
        maxTime: timestamp,
      };
      groups.set(key, group);
    }

    group.readings.push({
      latitude: reading.latitude,
      longitude: reading.longitude,
      timestamp,
    });
    if (timestamp.getTime() < group.minTime.getTime()) group.minTime = timestamp;
    if (timestamp.getTime() > group.maxTime.getTime()) group.maxTime = timestamp;
  }

  return [...groups.values()];
}

port.on("message", (job: TelemetryJob) => {
  const startedAt = performance.now();
  try {
    const readings = Array.isArray(job.payload) ? job.payload : [job.payload];

    const validReadings = readings.filter((reading) => {
      if (typeof reading !== "object" || reading === null) {
        return false;
      }

      const item = reading as Record<string, unknown>;

      const hasValidTimestamp =
        item.timestamp === undefined ||
        ((typeof item.timestamp === "string" || typeof item.timestamp === "number") &&
          !Number.isNaN(new Date(item.timestamp).getTime()));

      return (
        typeof item.vehicleId === "string" &&
        item.vehicleId.trim().length > 0 &&
        typeof item.latitude === "number" &&
        Number.isFinite(item.latitude) &&
        item.latitude >= -90 &&
        item.latitude <= 90 &&
        typeof item.longitude === "number" &&
        Number.isFinite(item.longitude) &&
        item.longitude >= -180 &&
        item.longitude <= 180 &&
        hasValidTimestamp
      );
    });

    port.postMessage({
      id: job.id,
      success: true,
      received: readings.length,
      validCount: validReadings.length,
      bucketGroups: groupIntoBuckets(validReadings as TelemetryReading[]),
      parseMs: performance.now() - startedAt,
    });
  } catch {
    port.postMessage({
      id: job.id,
      success: false,
      received: 0,
      validCount: 0,
      bucketGroups: [],
      parseMs: performance.now() - startedAt,
      message: "Telemetry processing failed",
    });
  }
});
