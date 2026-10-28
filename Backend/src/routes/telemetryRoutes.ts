import { Router, Request, Response } from "express";
import { processTelemetry } from "../services/telemetryService";

const router = Router();

router.post("/", async (req: Request, res: Response) => {
  const telemetry = req.body;

  if (
    telemetry === undefined ||
    telemetry === null ||
    typeof telemetry !== "object"
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid telemetry data",
    });
  }

  try {
    const result = await processTelemetry(telemetry);

    if (result.validCount === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid telemetry readings",
        received: result.received,
      });
    }

    return res.status(202).json({
      success: true,
      received: result.received,
      validCount: result.validCount,
    });
  } catch (error) {
    console.error("Telemetry worker error:", error);

    return res.status(500).json({
      success: false,
      message: "Telemetry processing failed",
    });
  }
});

export default router;