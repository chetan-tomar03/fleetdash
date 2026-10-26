import mongoose from "mongoose";

export async function connectDB(): Promise<void> {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error("MONGODB_URI is missing in the .env file");
  }

  await mongoose.connect(mongoUri);

  console.log("FleetDash MongoDB connected successfully");
}