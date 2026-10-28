import { parentPort } from "worker_threads";

if (!parentPort) {
  throw new Error("Telemetry worker must run inside a worker thread");
}

const port = parentPort;

interface TelemetryJob {
  id: number;
  payload: unknown;
}

port.on("message", (job: TelemetryJob) => {
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
      validReadings,
    });
  } catch {
    port.postMessage({
      id: job.id,
      success: false,
      received: 0,
      validCount: 0,
      validReadings: [],
      message: "Telemetry processing failed",
    });
  }
});