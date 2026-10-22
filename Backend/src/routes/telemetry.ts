import path from "path";
import { Worker } from "worker_threads";
import { Router, Request, Response } from "express";
import type { ParseResult } from "../types";

// Compile ke baad ye file dist/workers/parseWorker.js ban jati hai
const worker = new Worker(path.join(__dirname, "..", "workers", "parseWorker.js"));
const pending = new Map<number, (result: ParseResult) => void>();
let nextJobId = 0;

worker.on("message", (result: ParseResult) => {
  const resolve = pending.get(result.id);
  if (resolve) {
    pending.delete(result.id);
    resolve(result);
  }
});

worker.on("error", (error) => {
  console.error("Parse worker error:", error);
});

function parseInWorker(payload: unknown): Promise<ParseResult> {
  return new Promise((resolve) => {
    const id = nextJobId++;
    pending.set(id, resolve);
    worker.postMessage({ id, payload });
  });
}

const router = Router();

router.post("/", async (req: Request, res: Response) => {
  const result = await parseInWorker(req.body);

  if (result.points.length === 0) {
    res.status(400).json({
      success: false,
      message: "No valid telemetry points",
      rejected: result.rejected,
    });
    return;
  }

  // TODO: MongoDB bucket me save karna (next fix), phir Redis Pub/Sub
  res.status(202).json({
    success: true,
    accepted: result.points.length,
    rejected: result.rejected,
  });
});

export default router;