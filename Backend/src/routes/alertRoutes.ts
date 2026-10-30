import { Request, Response, Router } from "express";
import GeofenceAlert from "../models/GeofenceAlert";

const router = Router();
const defaultLimit = 100;
const maxLimit = 500;

router.get("/", async (req: Request, res: Response) => {
  const requestedLimit = Number(req.query.limit || defaultLimit);
  if (!Number.isInteger(requestedLimit) || requestedLimit < 1 || requestedLimit > maxLimit) {
    return res.status(400).json({
      success: false,
      message: `limit must be an integer between 1 and ${maxLimit}`,
    });
  }

  try {
    const alerts = await GeofenceAlert.find()
      .sort({ timestamp: -1 })
      .limit(requestedLimit)
      .lean()
      .exec();
    return res.json({ success: true, count: alerts.length, alerts });
  } catch (error) {
    console.error("Alert list query failed:", error);
    return res.status(500).json({ success: false, message: "Unable to load alerts" });
  }
});

export default router;
