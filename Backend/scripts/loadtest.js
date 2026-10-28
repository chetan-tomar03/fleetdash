require("dotenv").config();
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

const rate = process.argv[2] || "500";
const duration = process.argv[3] || "30s";
const runId = `t${rate}x${Date.now()}`;
const root = path.resolve(__dirname, "..", "..");

async function main() {
  console.log(`\nStarting test: ${rate} requests per second for ${duration}...\n`);

  spawnSync(
    "k6",
    ["run", "--quiet", "-e", `RUN_ID=${runId}`, "-e", `RATE=${rate}`, "-e", `DURATION=${duration}`, "load-tests/telemetry.js"],
    { cwd: root, stdio: "inherit" }
  );

  const summaryPath = path.join(root, "load-tests", "last-run.json");
  if (!fs.existsSync(summaryPath)) {
    console.log("Result file not found. Check that the server (npm start) is running and k6 is installed.");
    return;
  }
  const result = JSON.parse(fs.readFileSync(summaryPath, "utf8"));

  await mongoose.connect(process.env.MONGODB_URI);
  const rows = await mongoose.connection
    .collection("telemetrybuckets")
    .aggregate([
      { $match: { vehicleId: { $regex: `^LT-${runId}-` } } },
      { $group: { _id: null, stored: { $sum: "$count" } } },
    ])
    .toArray();
  const stored = rows.length > 0 ? rows[0].stored : 0;
  await mongoose.disconnect();

  const noLoss = stored === result.accepted;
  const reachedRate = result.dropped === 0;

  console.log("========== RESULT ==========");
  console.log(`Target rate            : ${rate} requests/sec`);
  console.log(`Accepted by server     : ${result.accepted}`);
  console.log(`Saved in database      : ${stored}`);
  console.log(`Failed requests        : ${result.failedPercent.toFixed(2)}%`);
  console.log(`Average response time  : ${result.avgMs.toFixed(1)} ms`);
  console.log(`95% of requests within : ${result.p95Ms.toFixed(1)} ms`);
  console.log("----------------------------");
  console.log(noLoss ? "Zero data loss        : PASS" : "Zero data loss        : FAIL (some readings were not saved)");
  console.log(
    reachedRate
      ? "Target rate reached   : PASS"
      : `Target rate reached   : FAIL (${result.dropped} requests were dropped, the server could not keep up)`
  );
  console.log("============================\n");
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});