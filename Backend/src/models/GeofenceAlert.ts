import mongoose, { Document, Schema } from "mongoose";

export type BreachType = "enter" | "exit";

export interface GeofenceAlertDocument extends Document {
  vehicleId: string;
  geofenceId: mongoose.Types.ObjectId;
  timestamp: Date;
  latitude: number;
  longitude: number;
  type: BreachType;
}

const GeofenceAlertSchema = new Schema<GeofenceAlertDocument>(
  {
    vehicleId: { type: String, required: true, index: true },
    geofenceId: { type: Schema.Types.ObjectId, required: true, index: true },
    timestamp: { type: Date, required: true, index: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    type: { type: String, enum: ["enter", "exit"], required: true },
  },
  { timestamps: true }
);

GeofenceAlertSchema.index({ timestamp: -1 });

export default mongoose.model<GeofenceAlertDocument>("GeofenceAlert", GeofenceAlertSchema);
