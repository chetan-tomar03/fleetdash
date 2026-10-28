import { Worker } from "worker_threads";
import path from "path";
import TelemetryBucket from "../models/TelemetryBucket";

interface TelemetryReading {
  vehicleId: string;
  latitude: number;
  longitude: number;
  timestamp?: string | Date;
}

interface WorkerResult {
  id: number;
  success: boolean;
  received: number;
  validCount: number;
  validReadings: TelemetryReading[];
  message?: string;
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

// Ek hi worker, server ke saath hamesha chalta hai (har request par naya nahi banta)
const worker = new Worker(path.resolve(__dirname, "../workers/telemetryWorker.js"));
const pending = new Map<number, (result: WorkerResult) => void>();
let nextJobId = 0;

worker.on("message", (result: WorkerResult) => {
  const resolve = pending.get(result.id);
  if (resolve) {
    pending.delete(result.id);
    resolve(result);
  }
});

function failAllPending(message: string): void {
  for (const [id, resolve] of pending) {
    resolve({ id, success: false, received: 0, validCount: 0, validReadings: [], message });
  }
  pending.clear();
}

worker.on("error", (error) => {
  console.error("Telemetry worker error:", error);
  failAllPending("Telemetry worker crashed");
});

worker.on("exit", (code) => {
  if (code !== 0) {
    console.error(`Telemetry worker stopped with exit code ${code}`);
    failAllPending("Telemetry worker stopped");
  }
});

function parseInWorker(payload: unknown): Promise<WorkerResult> {
  return new Promise((resolve) => {
    const id = nextJobId++;
    pending.set(id, resolve);
    worker.postMessage({ id, payload });
  });
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

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: number }).code === 11000
  );
}

export async function processTelemetry(telemetry: unknown): Promise<WorkerResult> {
  const result = await parseInWorker(telemetry);

  if (!result.success) {
    throw new Error(result.message || "Telemetry processing failed");
  }

  if (result.validCount === 0) {
    return result;
  }

  const operations = groupIntoBuckets(result.validReadings).map((group) => ({
    updateOne: {
      filter: { vehicleId: group.vehicleId, bucketStart: group.bucketStart },
      update: {
        $setOnInsert: { bucketEnd: group.bucketEnd },
        $push: { readings: { $each: group.readings } },
        $inc: { count: group.readings.length },
        $min: { minTime: group.minTime },
        $max: { maxTime: group.maxTime },
      },
      upsert: true,
    },
  }));

  try {
    await TelemetryBucket.bulkWrite(operations, { ordered: false });
  } catch (error) {
    // Do requests ek saath same naya bucket banayein to ek ko duplicate key error aata hai.
    // Dobara try karne par bucket mil jata hai aur update chal jata hai.
    if (isDuplicateKeyError(error)) {
      await TelemetryBucket.bulkWrite(operations, { ordered: false });
    } else {
      throw error;
    }
  }

  return result;
}