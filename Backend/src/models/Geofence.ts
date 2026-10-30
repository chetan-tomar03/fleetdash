import mongoose, { Document, Schema } from "mongoose";

export interface GeoJSONPolygon {
  type: "Polygon";
  coordinates: number[][][];
}

export interface GeofenceDocument extends Document {
  name: string;
  geometry: GeoJSONPolygon;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const GeofenceSchema = new Schema<GeofenceDocument>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    geometry: { type: Schema.Types.Mixed, required: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

GeofenceSchema.index({ geometry: "2dsphere" });

export default mongoose.model<GeofenceDocument>("Geofence", GeofenceSchema);
