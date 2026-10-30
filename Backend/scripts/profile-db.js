const path = require("path");
const mongoose = require("mongoose");

require("dotenv").config({
  path: path.join(__dirname, "..", ".env"),
});

async function main() {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is missing in Backend/.env");
  }

  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 5000,
  });

  const collection = mongoose.connection.collection("telemetrybuckets");
  const indexes = await collection.indexes();
  const sample = await collection.findOne(
    {},
    { projection: { vehicleId: 1, bucketStart: 1 } }
  );

  if (!sample) {
    console.log(JSON.stringify({ indexes, sample: null }, null, 2));
    return;
  }

  const explain = await collection
    .find({
      vehicleId: sample.vehicleId,
      bucketStart: { $gte: new Date(0) },
    })
    .sort({ bucketStart: 1 })
    .explain("executionStats");

  const stats = explain.executionStats;
  console.log(
    JSON.stringify(
      {
        indexes,
        sample: { vehicleId: sample.vehicleId },
        executionTimeMs: stats.executionTimeMillis,
        nReturned: stats.nReturned,
        totalKeysExamined: stats.totalKeysExamined,
        totalDocsExamined: stats.totalDocsExamined,
        winningPlan: explain.queryPlanner.winningPlan,
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error("Database profiling failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => undefined);
  });
