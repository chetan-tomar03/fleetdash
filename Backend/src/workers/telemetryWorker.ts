
import { parentPort } from "worker_threads";

if (!parentPort) {
  throw new Error("Telemetry worker must run inside a worker thread");
}

parentPort.on("message", (telemetry: unknown) => {
  try {
    const readings = Array.isArray(telemetry) ? telemetry : [telemetry];

    const validReadings = readings.filter((reading) => {
      if (typeof reading !== "object" || reading === null) {
        return false;
      }

      const item = reading as Record<string, unknown>;

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
        item.longitude <= 180
      );
    });

    parentPort!.postMessage({
      success: true,
      received: readings.length,
      validCount: validReadings.length,
      validReadings,
    });
  } catch {
    parentPort!.postMessage({
      success: false,
      message: "Telemetry processing failed",
    });
  }
});
