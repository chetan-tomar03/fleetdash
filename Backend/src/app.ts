
import express from "express";
import cors from "cors";
import telemetryRoutes from "./routes/telemetryRoutes";
import vehicleRoutes from "./routes/vehicleRoutes";
import geofenceRoutes from "./routes/geofenceRoutes";
import alertRoutes from "./routes/alertRoutes";

const app = express();

app.use(cors());
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || "1mb" }));

app.get("/", (_req, res) => {
  res.json({
    success: true,
    message: "FleetDash backend is running",
  });
});

app.use("/api/telemetry", telemetryRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/geofences", geofenceRoutes);
app.use("/api/alerts", alertRoutes);

export default app;
