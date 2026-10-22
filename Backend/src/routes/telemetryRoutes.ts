
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

    return res.status(202).json(result);
  } catch (error) {
    console.error("Telemetry worker error:", error);

    return res.status(500).json({
      success: false,
      message: "Telemetry processing failed",
    });
  }
});

export default router;
