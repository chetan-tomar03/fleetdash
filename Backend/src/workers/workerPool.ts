import { Worker } from "worker_threads";
import path from "path";

interface WorkerResult {
  success: boolean;
  received: number;
  validCount: number;
  validReadings: {
    vehicleId: string;
    latitude: number;
    longitude: number;
    timestamp?: string | Date;
  }[];
  message?: string;
}

interface WorkerTask {
  data: unknown;
  resolve: (result: WorkerResult) => void;
  reject: (error: Error) => void;
}

interface WorkerSlot {
  worker: Worker;
  busy: boolean;
  failed: boolean;
  currentTask?: WorkerTask;
}

class WorkerPool {
  private workers: WorkerSlot[] = [];
  private queue: WorkerTask[] = [];
  private readonly poolSize = 4;

  constructor() {
    for (let i = 0; i < this.poolSize; i++) {
      this.createWorker();
    }
  }

  private createWorker(): void {
    const workerPath = path.resolve(
      __dirname,
      "telemetryWorker.js"
    );

    const worker = new Worker(workerPath);
    const slot: WorkerSlot = {
      worker,
      busy: false,
      failed: false,
    };

    this.workers.push(slot);

    worker.on("message", (result: WorkerResult) => {
      slot.currentTask?.resolve(result);
      slot.currentTask = undefined;
      slot.busy = false;
      this.runNext();
    });

    worker.on("error", (error: Error) => {
      this.handleWorkerFailure(slot, error);
    });

    worker.on("exit", (code: number) => {
      if (!slot.failed) {
        this.handleWorkerFailure(
          slot,
          new Error(`Worker exited with code ${code}`)
        );
      }
    });
  }

  private handleWorkerFailure(
    slot: WorkerSlot,
    error: Error
  ): void {
    if (slot.failed) return;

    slot.failed = true;
    slot.currentTask?.reject(error);

    const index = this.workers.indexOf(slot);

    if (index !== -1) {
      this.workers.splice(index, 1);
    }

    this.createWorker();
    this.runNext();
  }

  private runNext(): void {
    const slot = this.workers.find(
      (worker) => !worker.busy && !worker.failed
    );

    const task = this.queue.shift();

    if (!slot || !task) {
      if (task) this.queue.unshift(task);
      return;
    }

    slot.busy = true;
    slot.currentTask = task;
    slot.worker.postMessage(task.data);
  }

  execute(data: unknown): Promise<WorkerResult> {
    return new Promise((resolve, reject) => {
      this.queue.push({ data, resolve, reject });
      this.runNext();
    });
  }
}

export const telemetryWorkerPool = new WorkerPool();