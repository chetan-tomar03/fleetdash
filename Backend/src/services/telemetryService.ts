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

interface QueuedWrite {
  readings: TelemetryReading[];
  resolve: () => void;
  reject: (error: unknown) => void;
}

// ---------- Worker (one worker for the whole server lifetime) ----------

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

// ---------- Bucket building ----------

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

function buildOperations(readings: TelemetryReading[]) {
  return groupIntoBuckets(readings).map((group) => ({
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
}

// If every failed operation is a duplicate key error (two writers created the same new bucket
// at the same time), return the indexes of only those operations so they can be retried safely.
function getDuplicateKeyIndexes(error: unknown): number[] | null {
  if (typeof error !== "object" || error === null) return null;

  const writeErrors = (error as { writeErrors?: { index: number; code: number }[] }).writeErrors;
  if (!Array.isArray(writeErrors) || writeErrors.length === 0) return null;
  if (!writeErrors.every((item) => item.code === 11000)) return null;

  return writeErrors.map((item) => item.index);
}

async function writeReadings(readings: TelemetryReading[]): Promise<void> {
  const operations = buildOperations(readings);
  if (operations.length === 0) return;

  try {
    await TelemetryBucket.bulkWrite(operations, { ordered: false });
  } catch (error) {
    const failedIndexes = getDuplicateKeyIndexes(error);
    if (failedIndexes === null) throw error;

    // Retry only the operations that failed, so nothing is counted twice
    await TelemetryBucket.bulkWrite(
      failedIndexes.map((index) => operations[index]),
      { ordered: false }
    );
  }
}

// ---------- Write batching ----------
// Many requests arrive every second. Instead of one database call per request,
// we collect readings for a short time and save them all with a single bulkWrite.
// Each request still waits until its readings are saved before it gets a response.

const FLUSH_INTERVAL_MS = 25;
const queue: QueuedWrite[] = [];
let flushTimer: NodeJS.Timeout | null = null;
let flushing = false;

function scheduleFlush(): void {
  if (flushTimer || flushing) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flushQueue();
  }, FLUSH_INTERVAL_MS);
}

async function flushQueue(): Promise<void> {
  if (flushing || queue.length === 0) return;

  flushing = true;
  const batch = queue.splice(0, queue.length);

  try {
    await writeReadings(batch.flatMap((item) => item.readings));
    batch.forEach((item) => item.resolve());
  } catch (error) {
    batch.forEach((item) => item.reject(error));
  } finally {
    flushing = false;
    if (queue.length > 0) scheduleFlush();
  }
}

function enqueueWrite(readings: TelemetryReading[]): Promise<void> {
  return new Promise((resolve, reject) => {
    queue.push({ readings, resolve, reject });
    scheduleFlush();
  });
}

// ---------- Public API ----------

export async function processTelemetry(telemetry: unknown): Promise<WorkerResult> {
  const result = await parseInWorker(telemetry);

  if (!result.success) {
    throw new Error(result.message || "Telemetry processing failed");
  }

  if (result.validCount === 0) {
    return result;
  }

  await enqueueWrite(result.validReadings);
  return result;
}