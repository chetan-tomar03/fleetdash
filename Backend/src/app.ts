
import express from "express";
import cors from "cors";
import telemetryRoutes from "./routes/telemetryRoutes";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({
    success: true,
    message: "FleetDash backend is running",
  });
});

app.use("/api/telemetry", telemetryRoutes);

export default app;
