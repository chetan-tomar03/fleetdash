import { io } from "socket.io-client";

const socket = io("http://localhost:4000");

socket.on("connect", () => {
  console.log("Connected to FleetDash Socket.io:", socket.id);
});

socket.on("telemetry-batch", (data: ArrayBuffer | Buffer) => {
  console.log("Binary batch received!");

  const buffer = Buffer.isBuffer(data)
    ? data
    : Buffer.from(data);

  const view = new DataView(
    buffer.buffer,
    buffer.byteOffset,
    buffer.byteLength
  );

  const readingCount = view.getUint32(0, true);

  console.log("Is binary data:", Buffer.isBuffer(data) || data instanceof ArrayBuffer);
  console.log("Reading count:", readingCount);
  console.log("Payload size:", buffer.byteLength, "bytes");
});

socket.on("disconnect", (reason) => {
  console.log("Socket disconnected:", reason);
});

socket.on("connect_error", (error) => {
  console.error("Socket connection failed:", error.message);
});