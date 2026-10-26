
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
  success: boolean;
  received: number;
  validCount: number;
  validReadings: TelemetryReading[];
  message?: string;
}

export async function processTelemetry(
  telemetry: unknown
): Promise<WorkerResult> {
  const result = await new Promise<WorkerResult>((resolve, reject) => {
    const workerPath = path.resolve(
      __dirname,
      "../workers/telemetryWorker.js"
    );

    const worker = new Worker(workerPath);

    worker.once("message", (data: WorkerResult) => {
      resolve(data);
    });

    worker.once("error", reject);

    worker.once("exit", (code) => {
      if (code !== 0) {
        reject(new Error(`Worker stopped with exit code ${code}`));
      }
    });

    worker.postMessage(telemetry);
  });

  if (!result.success) {
    throw new Error(result.message || "Telemetry processing failed");
  }

  for (const reading of result.validReadings) {
    const timestamp = reading.timestamp
      ? new Date(reading.timestamp)
      : new Date();

    if (Number.isNaN(timestamp.getTime())) {
      continue;
    }

    const bucketStart = new Date(timestamp);
    bucketStart.setUTCMinutes(0, 0, 0);

    const bucketEnd = new Date(bucketStart);
    bucketEnd.setUTCHours(bucketEnd.getUTCHours() + 1);

    await TelemetryBucket.updateOne(
      {
        vehicleId: reading.vehicleId,
        bucketStart,
      },
      {
        $setOnInsert: {
          vehicleId: reading.vehicleId,
          bucketStart,
          bucketEnd,
        },
        $push: {
          readings: {
            latitude: reading.latitude,
            longitude: reading.longitude,
            timestamp,
          },
        },
        $inc: { count: 1 },
        $min: { minTime: timestamp },
        $max: { maxTime: timestamp },
      },
      { upsert: true }
    );
  }

  return result;
}
