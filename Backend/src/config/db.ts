import mongoose from "mongoose";

export async function connectDB(): Promise<void> {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error("MONGODB_URI is missing in the .env file");
  }

  await mongoose.connect(mongoUri, {
    maxPoolSize: Number(process.env.MONGO_MAX_POOL_SIZE) || 100,
    minPoolSize: Number(process.env.MONGO_MIN_POOL_SIZE) || 5,
    serverSelectionTimeoutMS: Number(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS) || 5000,
  });

  console.log("FleetDash MongoDB connected successfully");
}
