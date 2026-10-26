import "dotenv/config";
import http from "http";
import { Server } from "socket.io";
import app from "./app";
import { connectDB } from "./config/db";

const PORT = Number(process.env.PORT) || 5000;

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const VEHICLE_COUNT = 100;
const FIELDS_PER_RECORD = 4;
const BYTES_PER_RECORD = 16;

function buildFrame(count: number): ArrayBuffer {
  const buffer = new ArrayBuffer(count * BYTES_PER_RECORD);
  const ids = new Uint32Array(buffer);
  const values = new Float32Array(buffer);

  for (let i = 0; i < count; i++) {
    const base = i * FIELDS_PER_RECORD;
    ids[base] = i;
    values[base + 1] = 12.9 + Math.random() * 0.2; // lat
    values[base + 2] = 77.5 + Math.random() * 0.2; // lng
    values[base + 3] = Math.random() * 60; // speed km/h
  }
  return buffer;
}

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);
});

setInterval(() => {
  io.emit("telemetry:frame", buildFrame(VEHICLE_COUNT));
}, 100);

async function startServer(): Promise<void> {
  try {
    await connectDB();

    server.listen(PORT, () => {
      console.log(`FleetDash backend running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start FleetDash backend:", error);
    process.exit(1);
  }
}

startServer();