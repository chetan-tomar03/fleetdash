import mongoose, { Schema, Document } from "mongoose";

interface TelemetryReading {
  latitude: number;
  longitude: number;
  timestamp: Date;
}

interface TelemetryBucketDocument extends Document {
  vehicleId: string;
  bucketStart: Date;
  bucketEnd: Date;
  readings: TelemetryReading[];
  count: number;
  minTime: Date;
  maxTime: Date;
}

const TelemetryReadingSchema = new Schema<TelemetryReading>(
  {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    timestamp: { type: Date, required: true },
  },
  { _id: false }
);

const TelemetryBucketSchema = new Schema<TelemetryBucketDocument>(
  {
    vehicleId: { type: String, required: true },
    bucketStart: { type: Date, required: true },
    bucketEnd: { type: Date, required: true },
    readings: { type: [TelemetryReadingSchema], default: [] },
    count: { type: Number, default: 0 },
    minTime: { type: Date, required: true },
    maxTime: { type: Date, required: true },
  },
  { timestamps: true }
);

TelemetryBucketSchema.index(
  { vehicleId: 1, bucketStart: 1 },
  { unique: true }
);

export default mongoose.model<TelemetryBucketDocument>(
  "TelemetryBucket",
  TelemetryBucketSchema
);