import "dotenv/config";
import http from "http";
import express from "express";
import cors from "cors";
import { Server } from "socket.io";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({
    success: true,
    message: "FleetDash backend is running",
  });
});

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// Frame format (same as frontend):
// har vehicle ke 16 bytes = [uint32 id][float32 lat][float32 lng][float32 speed]
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

// Dummy data: har 100ms me ek frame (abhi random, baad me real data aayega)
setInterval(() => {
  io.emit("telemetry:frame", buildFrame(VEHICLE_COUNT));
}, 100);

server.listen(PORT, () => {
  console.log(`FleetDash backend running on port ${PORT}`);
});