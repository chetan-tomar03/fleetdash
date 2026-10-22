import { parentPort } from "worker_threads";
import type { ParseJob, ParseResult, TelemetryPoint } from "../types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parsePoint(raw: unknown): TelemetryPoint | null {
  if (!isRecord(raw)) return null;

  const { vehicleId, lat, lng, speed, timestamp } = raw;

  if (typeof vehicleId !== "number" || !Number.isInteger(vehicleId) || vehicleId < 0) return null;
  if (typeof lat !== "number" || lat < -90 || lat > 90) return null;
  if (typeof lng !== "number" || lng < -180 || lng > 180) return null;

  return {
    vehicleId,
    lat,
    lng,
    speed: typeof speed === "number" && speed >= 0 ? speed : 0,
    timestamp: typeof timestamp === "number" ? timestamp : Date.now(),
  };
}

parentPort?.on("message", (job: ParseJob) => {
  const items: unknown[] = Array.isArray(job.payload) ? job.payload : [job.payload];
  const points: TelemetryPoint[] = [];

  for (const item of items) {
    const point = parsePoint(item);
    if (point) points.push(point);
  }

  const result: ParseResult = {
    id: job.id,
    points,
    rejected: items.length - points.length,
  };
  parentPort?.postMessage(result);
});