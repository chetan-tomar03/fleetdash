const path = require("path");
const backendRoot = path.resolve(__dirname, "..");
require("dotenv").config({ path: path.join(backendRoot, ".env") });

const { spawnSync } = require("child_process");
const fs = require("fs");
const http = require("http");
const https = require("https");
const mongoose = require("mongoose");

const rate = process.argv[2] || "500";
const duration = process.argv[3] || "30s";
const baseUrl = process.env.BASE_URL || "http://localhost:5000";
const preAllocatedVUs = process.env.PRE_ALLOCATED_VUS || "500";
const maxVUs = process.env.MAX_VUS || "2000";
const vehicles = process.env.VEHICLES || "500";
const batchSize = process.env.BATCH_SIZE || "1";
const parseResponse = process.env.PARSE_RESPONSE || "true";
const drainWaitMs = Number(process.env.DRAIN_WAIT_MS || 3000);
const runId = `t${rate}x${Date.now()}`;
const root = path.resolve(__dirname, "..", "..");
const summaryPath = path.join(root, "load-tests", "last-run.json");

function validateInputs() {
  const numericRate = Number(rate);
  if (!Number.isInteger(numericRate) || numericRate <= 0) {
    throw new Error("Rate must be a positive integer, for example: npm run loadtest -- 2000 30s");
  }

  if (!/^\d+(\.\d+)?(ms|s|m|h)$/.test(duration)) {
    throw new Error("Duration must use a k6 duration such as 30s, 1m, or 250ms");
  }

  if (!Number.isInteger(drainWaitMs) || drainWaitMs < 0) {
    throw new Error("DRAIN_WAIT_MS must be a non-negative integer");
  }

  const allocated = Number(preAllocatedVUs);
  const maximum = Number(maxVUs);
  if (!Number.isInteger(allocated) || allocated <= 0 || !Number.isInteger(maximum) || maximum < allocated) {
    throw new Error("PRE_ALLOCATED_VUS and MAX_VUS must be positive integers, with MAX_VUS >= PRE_ALLOCATED_VUS");
  }
}

function isLocalMongoUri(uri) {
  const match = /^(mongodb:\/\/)(?:[^@/]+@)?(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?(?:\/|$)/i.exec(uri);
  return Boolean(match);
}

function readSummary() {
  if (!fs.existsSync(summaryPath)) {
    throw new Error(
      "Result file not found. Check that the server is running and k6 is installed."
    );
  }

  const result = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
  if (result.runId !== runId) {
    throw new Error("k6 did not write a fresh result for this run");
  }
  return result;
}

function waitForServer(url, timeoutMs = 60000) {
  const client = url.startsWith("https:") ? https : http;
  const deadline = Date.now() + timeoutMs;

  return new Promise((resolve, reject) => {
    const attempt = () => {
      const request = client.get(`${url.replace(/\/$/, "")}/`, (response) => {
        response.resume();
        if (response.statusCode && response.statusCode < 500) {
          resolve();
          return;
        }
        retry();
      });

      request.setTimeout(2000, () => request.destroy());
      request.on("error", retry);
    };

    const retry = () => {
      if (Date.now() >= deadline) {
        reject(new Error(`Backend did not become ready within ${timeoutMs / 1000} seconds`));
        return;
      }
      setTimeout(attempt, 500);
    };

    attempt();
  });
}

async function main() {
  validateInputs();

  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is missing in Backend/.env");
  }

  if (process.env.ALLOW_REMOTE_MONGO !== "true" && !isLocalMongoUri(process.env.MONGODB_URI)) {
    throw new Error("Load tests are restricted to local MongoDB. Set ALLOW_REMOTE_MONGO=true only when explicitly intended.");
  }

  if (fs.existsSync(summaryPath)) {
    fs.unlinkSync(summaryPath);
  }

  console.log(
    `\nStarting test: ${rate} requests per second for ${duration} against ${baseUrl}...\n`
  );

  console.log("Waiting for backend readiness...");
  await waitForServer(baseUrl);
  console.log("Backend is ready. Starting k6...\n");

  const k6 = spawnSync(
    "k6",
    [
      "run",
      "--quiet",
      "-e",
      `BASE_URL=${baseUrl}`,
      "-e",
      `PRE_ALLOCATED_VUS=${preAllocatedVUs}`,
      "-e",
      `MAX_VUS=${maxVUs}`,
      "-e",
      `VEHICLES=${vehicles}`,
      "-e",
      `BATCH_SIZE=${batchSize}`,
      "-e",
      `PARSE_RESPONSE=${parseResponse}`,
      "-e",
      `RUN_ID=${runId}`,
      "-e",
      `RATE=${rate}`,
      "-e",
      `DURATION=${duration}`,
      "load-tests/telemetry.js",
    ],
    { cwd: root, stdio: "inherit" }
  );

  if (k6.error) {
    throw new Error(`Unable to start k6: ${k6.error.message}`);
  }

  if (k6.status !== 0 && k6.status !== 99 && k6.status !== null) {
    throw new Error(`k6 failed with exit code ${k6.status}; no result is trusted from this run`);
  }

  let result;
  try {
    result = readSummary();
  } catch (error) {
    if (k6.status !== 0 && k6.status !== 99) {
      throw new Error(`k6 failed with exit code ${k6.status} and did not produce a result: ${error.message}`);
    }
    throw error;
  }

  if (drainWaitMs > 0) {
    console.log(`Waiting ${drainWaitMs} ms for queued telemetry writes to drain...`);
    await new Promise((resolve) => setTimeout(resolve, drainWaitMs));
  }

  let stored = 0;
  let storedReadings = 0;
  let deletedBuckets = 0;
  const testFilter = { vehicleId: { $regex: `^LT-${runId}-` } };
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    });
    const rows = await mongoose.connection
      .collection("telemetrybuckets")
      .aggregate([
        { $match: testFilter },
        {
          $group: {
            _id: null,
            stored: { $sum: "$count" },
            storedReadings: {
              $sum: { $size: { $ifNull: ["$readings", []] } },
            },
          },
        },
      ], { maxTimeMS: 5000 })
      .toArray();
    stored = rows.length > 0 ? rows[0].stored : 0;
    storedReadings = rows.length > 0 ? rows[0].storedReadings : 0;
    deletedBuckets = (await mongoose.connection
      .collection("telemetrybuckets")
      .deleteMany(testFilter)).deletedCount;
  } finally {
    await mongoose.disconnect().catch(() => undefined);
  }

  const allRequestsAccepted = result.acceptedRequests === result.requests;
  const countMatchesArray = stored === storedReadings;
  const lost = result.accepted - stored;
  const extra = Math.max(0, stored - result.accepted);
  const noLoss = result.accepted > 0 && lost <= 0 && extra === 0 && countMatchesArray;
  const achievedRate = Number(result.achievedRate || 0);
  const reachedRate = result.dropped === 0 && achievedRate >= result.targetRate * 0.99;
  const p95WithinTarget = Number(result.p95Ms || 0) < 200;

  console.log("========== RESULT ==========");
  console.log(`Target rate            : ${rate} requests/sec`);
  console.log(`Test duration          : ${Number(result.durationSeconds || 0).toFixed(1)} seconds`);
  console.log(`HTTP requests sent     : ${result.requests}`);
  console.log(`Achieved rate          : ${achievedRate.toFixed(1)} requests/sec`);
  console.log(`Accepted by server     : ${result.accepted}`);
  console.log(`Saved in database      : ${stored}`);
  console.log(`Readings array count   : ${storedReadings}`);
  console.log(`Test buckets cleaned   : ${deletedBuckets}`);
  console.log(`Failed requests        : ${result.failedPercent.toFixed(2)}%`);
  console.log(`Average response time  : ${result.avgMs.toFixed(1)} ms`);
  console.log(`95% of requests within : ${result.p95Ms.toFixed(1)} ms`);
  console.log("----------------------------");
  console.log(
    allRequestsAccepted
      ? "All sent requests accepted: PASS"
      : `All sent requests accepted: FAIL (${result.requests - result.acceptedRequests} rejected)`
  );
  console.log(
    noLoss
      ? "Zero data loss        : PASS"
      : `Zero data loss        : FAIL (${Math.max(0, lost)} readings missing)`
  );
  console.log(`Extra readings stored  : ${extra}`);
  if (extra > 0) console.log("Extra data check       : FAIL (timeouts or duplicate writes possible)");
  if (stored === 0 && result.accepted > 0) {
    console.log("Warning                : Server may be using a different MongoDB URI or was not restarted after .env changes");
  }
  console.log(
    reachedRate
      ? "Target rate reached   : PASS"
      : `Target rate reached   : FAIL (${achievedRate.toFixed(1)} req/sec, ${result.dropped} dropped iterations)`
  );
  console.log(
    countMatchesArray
      ? "Count matches readings : PASS"
      : "Count matches readings : FAIL (bucket count and readings array differ)"
  );
  console.log(
    p95WithinTarget
      ? "P95 under 200 ms      : PASS"
      : `P95 under 200 ms      : FAIL (${Number(result.p95Ms || 0).toFixed(1)} ms)`
  );
  console.log("============================\n");

  if (!allRequestsAccepted || !noLoss || !reachedRate || !p95WithinTarget || k6.status !== 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
