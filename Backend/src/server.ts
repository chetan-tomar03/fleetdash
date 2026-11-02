import "dotenv/config";
import { createServer } from "http";
import { Server } from "socket.io";

import app from "./app";
import { connectDB } from "./config/db";
import { connectRedis, redisSubscriber } from "./config/redis";

const PORT = Number(process.env.PORT) || 4000;

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

interface TelemetryReading {
  vehicleId: string;
  latitude: number;
  longitude: number;
  timestamp?: string | Date;
}

const telemetryQueue: TelemetryReading[] = [];

io.on("connection", (socket) => {
  console.log("Socket client connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("Socket client disconnected:", socket.id);
  });
});

// Convert telemetry readings into binary ArrayBuffer
function createBinaryBatch(
  readings: TelemetryReading[]
): ArrayBuffer {
  const HEADER_SIZE = 4;
  const VEHICLE_ID_SIZE = 16;
  const RECORD_SIZE = 40;

  const buffer = Buffer.alloc(
    HEADER_SIZE + readings.length * RECORD_SIZE
  );

  // Store total reading count
  buffer.writeUInt32LE(readings.length, 0);

  readings.forEach((reading, index) => {
    const offset = HEADER_SIZE + index * RECORD_SIZE;

    // Vehicle ID: first 16 bytes
    const vehicleId = Buffer.from(reading.vehicleId, "utf8");
    vehicleId.copy(buffer, offset, 0, VEHICLE_ID_SIZE);

    // Latitude and longitude
    buffer.writeDoubleLE(reading.latitude, offset + 16);
    buffer.writeDoubleLE(reading.longitude, offset + 24);

    // Timestamp in milliseconds
    const timestamp = reading.timestamp
      ? new Date(reading.timestamp).getTime()
      : Date.now();

    buffer.writeDoubleLE(timestamp, offset + 32);
  });

  // Return an exact ArrayBuffer, not the Buffer's larger backing memory
  const arrayBuffer = new ArrayBuffer(buffer.length);
  new Uint8Array(arrayBuffer).set(buffer);

  return arrayBuffer;
}

async function startServer(): Promise<void> {
  try {
    await connectDB();
    await connectRedis();

    await redisSubscriber.subscribe(
      "fleetdash:telemetry",
      (message) => {
        try {
          const readings: TelemetryReading[] = JSON.parse(message);
          telemetryQueue.push(...readings);
        } catch (error) {
          console.error("Invalid Redis telemetry message:", error);
        }
      }
    );

    console.log("FleetDash Redis telemetry subscription active");

    // Send queued readings every 100 milliseconds
    setInterval(() => {
      if (telemetryQueue.length === 0) {
        return;
      }

      const batch = telemetryQueue.splice(0, telemetryQueue.length);
      const binaryData = createBinaryBatch(batch);

      io.emit("telemetry-batch", binaryData);

      console.log(
        `Broadcasted binary batch: ${batch.length} readings`
      );
    }, 100);

    httpServer.listen(PORT, () => {
      console.log(`FleetDash backend running on port ${PORT}`);
      console.log("Socket.io binary streaming is ready");
    });
  } catch (error) {
    console.error("Failed to start FleetDash backend:", error);
    process.exit(1);
  }
}

startServer();