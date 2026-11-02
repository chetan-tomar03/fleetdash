
import { telemetryWorkerPool } from "../workers/workerPool";
import TelemetryBucket from "../models/TelemetryBucket";
import redisClient from "../config/redis";

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
  const result = await telemetryWorkerPool.execute(telemetry);

  if (!result.success) {
    throw new Error(result.message || "Telemetry processing failed");
  }

  const operations = [];
  const publishReadings: TelemetryReading[] = [];

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

    operations.push({
      updateOne: {
        filter: {
          vehicleId: reading.vehicleId,
          bucketStart,
        },
        update: {
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
        upsert: true,
      },
    });

    publishReadings.push({
      ...reading,
      timestamp,
    });
  }

  // Perform MongoDB operations in one bulk request
  if (operations.length > 0) {
    await TelemetryBucket.bulkWrite(operations, {
      ordered: true,
    });

    console.log(
      `MongoDB bulk write completed: ${operations.length} readings`
    );
  }

  // Publish processed readings to Redis
  if (publishReadings.length > 0) {
    try {
      await redisClient.publish(
        "fleetdash:telemetry",
        JSON.stringify(publishReadings)
      );

      console.log(
        `Published ${publishReadings.length} readings to Redis`
      );
    } catch (error) {
      console.error("Redis publish failed:", error);
    }
  }

  return result;
}
