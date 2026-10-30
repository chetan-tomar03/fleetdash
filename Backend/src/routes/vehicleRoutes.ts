import { Router, Request, Response } from "express";
import TelemetryBucket from "../models/TelemetryBucket";

const router = Router();
const staleAfterMs = Number(process.env.VEHICLE_STALE_AFTER_MS) || 5 * 60 * 1000;
const maxHistoryReadings = Number(process.env.MAX_HISTORY_READINGS) || 10000;

function parseDate(value: unknown, fieldName: string): Date | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
    throw new Error(`${fieldName} must be a valid ISO date`);
  }
  return new Date(value);
}

router.get("/", async (_req: Request, res: Response) => {
  try {
    const vehicles = await TelemetryBucket.aggregate([
      { $unwind: "$readings" },
      { $sort: { "readings.timestamp": -1 } },
      {
        $group: {
          _id: "$vehicleId",
          latest: { $first: "$readings" },
        },
      },
      {
        $project: {
          _id: 0,
          vehicleId: "$_id",
          latitude: "$latest.latitude",
          longitude: "$latest.longitude",
          timestamp: "$latest.timestamp",
          status: {
            $cond: [
              {
                $gte: [
                  "$latest.timestamp",
                  new Date(Date.now() - staleAfterMs),
                ],
              },
              "active",
              "stale",
            ],
          },
        },
      },
      { $sort: { vehicleId: 1 } },
    ]).exec();

    return res.json({ success: true, count: vehicles.length, vehicles });
  } catch (error) {
    console.error("Vehicle list query failed:", error);
    return res.status(500).json({ success: false, message: "Unable to load vehicles" });
  }
});

router.get("/:id/history", async (req: Request, res: Response) => {
  const vehicleId = req.params.id;
  const now = new Date();

  try {
    const from = parseDate(req.query.from, "from") || new Date(now.getTime() - 60 * 60 * 1000);
    const to = parseDate(req.query.to, "to") || now;

    if (from > to) {
      return res.status(400).json({ success: false, message: "from must be before to" });
    }

    const buckets = await TelemetryBucket.find({
      vehicleId,
      bucketStart: { $lte: to },
      bucketEnd: { $gte: from },
    })
      .sort({ bucketStart: 1 })
      .lean()
      .exec();

    const readings = buckets
      .flatMap((bucket) => bucket.readings)
      .filter((reading) => reading.timestamp >= from && reading.timestamp <= to)
      .sort((left, right) => left.timestamp.getTime() - right.timestamp.getTime())
      .slice(0, maxHistoryReadings);

    return res.json({
      success: true,
      vehicleId,
      from: from.toISOString(),
      to: to.toISOString(),
      count: readings.length,
      truncated: readings.length === maxHistoryReadings,
      readings,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("must be a valid ISO date")) {
      return res.status(400).json({ success: false, message: error.message });
    }

    console.error("Vehicle history query failed:", error);
    return res.status(500).json({ success: false, message: "Unable to load vehicle history" });
  }
});

export default router;
