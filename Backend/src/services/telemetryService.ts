import { Worker } from "worker_threads";
import path from "path";
import { monitorEventLoopDelay, performance } from "perf_hooks";
import TelemetryBucket from "../models/TelemetryBucket";
import { checkGeofenceBreaches } from "./geofenceService";

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
  bucketGroups: BucketGroup[];
  parseMs: number;
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
  groups: BucketGroup[];
  attempts: number;
}

const MAX_QUEUE_REQUESTS = Number(process.env.MAX_QUEUE_REQUESTS) || 5000;
export const MAX_READINGS_PER_REQUEST = Number(process.env.MAX_READINGS_PER_REQUEST) || 1000;
const MAX_BATCH_REQUESTS = Number(process.env.MAX_BATCH_REQUESTS) || 250;
const MAX_CONCURRENT_FLUSHES = Number(process.env.MAX_CONCURRENT_FLUSHES) || 4;

const eventLoopDelay = monitorEventLoopDelay({ resolution: 20 });
eventLoopDelay.enable();
let previousEventLoopUtilization = performance.eventLoopUtilization();

const metricsWindow = {
  flushes: 0,
  readings: 0,
  requests: 0,
  bulkOperations: 0,
  totalFlushMs: 0,
  maxFlushMs: 0,
  workerParseMs: 0,
};
let flushStartedAt = 0;

// ---------- Worker pool ----------

type PendingRequest = {
  resolve: (result: WorkerResult) => void;
  reject: (error: Error) => void;
  workerIndex: number;
};

interface WorkerSlot {
  worker: Worker | null;
  healthy: boolean;
  pendingCount: number;
  restartTimer: NodeJS.Timeout | null;
}

// Keep local development conservative; increase via TELEMETRY_WORKERS on a dedicated host.
const defaultWorkerCount = 1;
const workerCount = Math.max(
  1,
  Math.min(8, Number(process.env.TELEMETRY_WORKERS) || defaultWorkerCount)
);
const workerSlots: WorkerSlot[] = Array.from({ length: workerCount }, () => ({
  worker: null,
  healthy: false,
  pendingCount: 0,
  restartTimer: null,
}));
const pending = new Map<number, PendingRequest>();
let nextJobId = 0;

function failPendingForWorker(workerIndex: number, error: Error): void {
  for (const [id, request] of pending) {
    if (request.workerIndex !== workerIndex) continue;
    pending.delete(id);
    workerSlots[workerIndex].pendingCount -= 1;
    request.reject(error);
  }
}

function scheduleWorkerRestart(workerIndex: number): void {
  const slot = workerSlots[workerIndex];
  if (slot.restartTimer) return;
  slot.restartTimer = setTimeout(() => {
    slot.restartTimer = null;
    if (!slot.healthy) startWorker(workerIndex);
  }, 100);
}

function handleWorkerFailure(workerIndex: number, failedWorker: Worker, error: Error): void {
  const slot = workerSlots[workerIndex];
  if (slot.worker !== failedWorker || !slot.healthy) return;
  slot.healthy = false;
  slot.worker = null;
  console.error(`Telemetry worker ${workerIndex} unavailable:`, error.message);
  failPendingForWorker(workerIndex, error);
  scheduleWorkerRestart(workerIndex);
}

function startWorker(workerIndex: number): void {
  const slot = workerSlots[workerIndex];
  const nextWorker = new Worker(path.resolve(__dirname, "../workers/telemetryWorker.js"));
  slot.worker = nextWorker;
  slot.healthy = true;

  nextWorker.on("message", (result: WorkerResult) => {
    metricsWindow.workerParseMs += result.parseMs || 0;
    const request = pending.get(result.id);
    if (request) {
      pending.delete(result.id);
      slot.pendingCount -= 1;
      request.resolve(result);
    }
  });

  nextWorker.on("error", (error) => {
    handleWorkerFailure(
      workerIndex,
      nextWorker,
      error instanceof Error ? error : new Error(String(error))
    );
  });

  nextWorker.on("exit", (code) => {
    handleWorkerFailure(workerIndex, nextWorker, new Error(`worker exited with code ${code}`));
  });
}

for (let workerIndex = 0; workerIndex < workerCount; workerIndex += 1) {
  startWorker(workerIndex);
}

function selectWorker(): number {
  let selectedIndex = -1;
  let lowestPendingCount = Number.POSITIVE_INFINITY;

  workerSlots.forEach((slot, index) => {
    if (slot.healthy && slot.worker && slot.pendingCount < lowestPendingCount) {
      selectedIndex = index;
      lowestPendingCount = slot.pendingCount;
    }
  });

  return selectedIndex;
}

function parseInWorker(payload: unknown): Promise<WorkerResult> {
  return new Promise((resolve, reject) => {
    const workerIndex = selectWorker();
    if (workerIndex < 0) {
      reject(new Error("Telemetry workers are restarting"));
      return;
    }

    const id = nextJobId++;
    const slot = workerSlots[workerIndex];
    const worker = slot.worker;
    if (!worker) {
      reject(new Error("Telemetry worker is unavailable"));
      return;
    }

    pending.set(id, { resolve, reject, workerIndex });
    slot.pendingCount += 1;
    try {
      worker.postMessage({ id, payload });
    } catch (error) {
      pending.delete(id);
      slot.pendingCount -= 1;
      reject(error instanceof Error ? error : new Error("Failed to send telemetry to worker"));
    }
  });
}

function logIngestMetrics(): void {
  const currentUtilization = performance.eventLoopUtilization(previousEventLoopUtilization);
  previousEventLoopUtilization = performance.eventLoopUtilization();
  const flushInProgressMs = flushStartedAt > 0 ? performance.now() - flushStartedAt : 0;
  const flushCount = metricsWindow.flushes;
  const averageFlushMs = flushCount > 0 ? metricsWindow.totalFlushMs / flushCount : 0;

  console.log(
    `[ingest] workers=${workerCount} queue=${queue.length} pendingParse=${pending.size} ` +
      `flushInProgressMs=${flushInProgressMs.toFixed(1)} ` +
      `windowFlushes=${flushCount} windowRequests=${metricsWindow.requests} ` +
      `windowReadings=${metricsWindow.readings} windowBulkOps=${metricsWindow.bulkOperations} ` +
      `avgFlushMs=${averageFlushMs.toFixed(1)} maxFlushMs=${metricsWindow.maxFlushMs.toFixed(1)} ` +
      `workerParseMs=${metricsWindow.workerParseMs.toFixed(1)} ` +
      `eventLoopP95Ms=${(eventLoopDelay.percentile(95) / 1e6).toFixed(1)} ` +
      `eventLoopUtilization=${(currentUtilization.utilization * 100).toFixed(1)}%`
  );

  metricsWindow.flushes = 0;
  metricsWindow.readings = 0;
  metricsWindow.requests = 0;
  metricsWindow.bulkOperations = 0;
  metricsWindow.totalFlushMs = 0;
  metricsWindow.maxFlushMs = 0;
  metricsWindow.workerParseMs = 0;
  eventLoopDelay.reset();
}

function buildOperations(groups: BucketGroup[]) {
  return groups.map((group) => ({
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

function mergeBucketGroups(groups: BucketGroup[]): BucketGroup[] {
  const merged = new Map<string, BucketGroup>();

  for (const group of groups) {
    const key = `${group.vehicleId}|${group.bucketStart.getTime()}`;
    const existing = merged.get(key);

    if (!existing) {
      merged.set(key, {
        vehicleId: group.vehicleId,
        bucketStart: group.bucketStart,
        bucketEnd: group.bucketEnd,
        readings: [...group.readings],
        minTime: group.minTime,
        maxTime: group.maxTime,
      });
      continue;
    }

    existing.readings.push(...group.readings);
    if (group.minTime.getTime() < existing.minTime.getTime()) existing.minTime = group.minTime;
    if (group.maxTime.getTime() > existing.maxTime.getTime()) existing.maxTime = group.maxTime;
  }

  return [...merged.values()];
}

// If every failed operation is a duplicate key error (two writers created the same new bucket
// at the same time), return the indexes of only those operations so they can be retried safely.
function getDuplicateKeyIndexes(error: unknown): number[] | null {
  if (typeof error !== "object" || error === null) return null;

  const rawWriteErrors = (error as { writeErrors?: unknown }).writeErrors;
  let writeErrors: { index: number; code: number }[] = [];
  if (Array.isArray(rawWriteErrors)) {
    writeErrors = rawWriteErrors as { index: number; code: number }[];
  } else if (
    typeof rawWriteErrors === "object" &&
    rawWriteErrors !== null &&
    "index" in rawWriteErrors &&
    "code" in rawWriteErrors
  ) {
    writeErrors = [rawWriteErrors as { index: number; code: number }];
  }

  if (writeErrors.length === 0) return null;
  if (!writeErrors.every((item) => item.code === 11000)) return null;

  return writeErrors.map((item) => item.index);
}

async function writeGroups(groups: BucketGroup[]): Promise<number> {
  const operations = buildOperations(mergeBucketGroups(groups));
  if (operations.length === 0) return 0;

  const collection = TelemetryBucket.collection;

  try {
    await collection.bulkWrite(operations as never[], { ordered: false });
    return operations.length;
  } catch (error) {
    const failedIndexes = getDuplicateKeyIndexes(error);
    if (failedIndexes === null) throw error;

    // Retry only the operations that failed, so nothing is counted twice
    try {
      await collection.bulkWrite(
        failedIndexes.map((index) => operations[index]) as never[],
        { ordered: false }
      );
    } catch (retryError) {
      throw new Error(
        `Duplicate-key retry failed after partial bulk write: ${
          retryError instanceof Error ? retryError.message : "unknown error"
        }`
      );
    }
    return operations.length;
  }
}

// ---------- Write batching ----------
// Many requests arrive every second. Instead of one database call per request,
// we collect readings for a short time and save them all with a single bulkWrite.
// Each request still waits until its readings are saved before it gets a response.

const queue: QueuedWrite[] = [];
const FLUSH_INTERVAL_MS = Number(process.env.FLUSH_INTERVAL_MS) || 50;
let flushTimer: NodeJS.Timeout | null = null;
let inFlightFlushes = 0;

if (process.env.INGEST_METRICS === "true") {
  const metricsTimer = setInterval(logIngestMetrics, 1000);
  metricsTimer.unref();
}

function scheduleFlush(): void {
  if (flushTimer || inFlightFlushes >= MAX_CONCURRENT_FLUSHES) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flushQueue();
  }, FLUSH_INTERVAL_MS);
}

async function flushQueue(): Promise<void> {
  if (queue.length === 0 || inFlightFlushes >= MAX_CONCURRENT_FLUSHES) return;

  inFlightFlushes += 1;
  const batch = queue.splice(0, queue.length);
  const groups = batch.flatMap((item) => item.groups);
  const readingCount = groups.reduce((total, group) => total + group.readings.length, 0);
  const startedAt = performance.now();
  flushStartedAt = startedAt;
  let bulkOperations = 0;

  try {
    bulkOperations = await writeGroups(groups);
  } catch (error) {
    const retryBatch = batch.filter((item) => item.attempts < 3);
    retryBatch.forEach((item) => { item.attempts += 1; });
    queue.unshift(...retryBatch);
    console.error(
      `[ingest] background write failed; retrying ${retryBatch.length}/${batch.length} request batches`,
      error instanceof Error ? error.message : error
    );
  } finally {
    const flushMs = performance.now() - startedAt;
    metricsWindow.flushes += 1;
    metricsWindow.requests += batch.length;
    metricsWindow.readings += readingCount;
    metricsWindow.bulkOperations += bulkOperations;
    metricsWindow.totalFlushMs += flushMs;
    metricsWindow.maxFlushMs = Math.max(metricsWindow.maxFlushMs, flushMs);
    flushStartedAt = 0;
    inFlightFlushes -= 1;
    if (queue.length > 0) {
      if (inFlightFlushes < MAX_CONCURRENT_FLUSHES) {
        void flushQueue();
      } else {
        scheduleFlush();
      }
    }
  }
}

function enqueueWrite(groups: BucketGroup[]): void {
  if (queue.length >= MAX_QUEUE_REQUESTS) {
    const error = new Error("Telemetry write queue is full");
    (error as Error & { code?: string }).code = "QUEUE_FULL";
    throw error;
  }

  queue.push({ groups, attempts: 0 });
  if (queue.length >= MAX_BATCH_REQUESTS) {
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
    if (inFlightFlushes < MAX_CONCURRENT_FLUSHES) {
      void flushQueue();
    } else {
      scheduleFlush();
    }
  } else {
    scheduleFlush();
  }
}


// ---------- Public API ----------

export async function processTelemetry(telemetry: unknown): Promise<WorkerResult> {
  const readingCount = Array.isArray(telemetry) ? telemetry.length : 1;
  if (readingCount > MAX_READINGS_PER_REQUEST) {
    throw new Error(`Telemetry payload exceeds ${MAX_READINGS_PER_REQUEST} readings`);
  }

  const result = await parseInWorker(telemetry);

  if (!result.success) {
    throw new Error(result.message || "Telemetry processing failed");
  }

  if (result.validCount === 0) {
    return result;
  }

  enqueueWrite(result.bucketGroups);
  void checkGeofenceBreaches(telemetry).catch((error: unknown) => {
    console.error("Geofence check failed:", error);
  });
  return result;
}
