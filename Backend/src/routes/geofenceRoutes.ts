import { Request, Response, Router } from "express";
import Geofence, { GeoJSONPolygon } from "../models/Geofence";

const router = Router();

function isValidPolygon(value: unknown): value is GeoJSONPolygon {
  if (typeof value !== "object" || value === null) return false;
  const polygon = value as { type?: unknown; coordinates?: unknown };
  if (polygon.type !== "Polygon" || !Array.isArray(polygon.coordinates)) return false;

  return polygon.coordinates.every((ring) => {
    if (!Array.isArray(ring) || ring.length < 4) return false;
    const first = ring[0];
    const last = ring[ring.length - 1];
    if (!Array.isArray(first) || !Array.isArray(last) || first.length !== 2 || last.length !== 2) {
      return false;
    }

    const isPosition = (position: unknown): position is number[] =>
      Array.isArray(position) &&
      position.length === 2 &&
      position.every((coordinate) => typeof coordinate === "number" && Number.isFinite(coordinate));

    return ring.every(isPosition) && first[0] === last[0] && first[1] === last[1];
  });
}

function validateBody(body: unknown): { name: string; geometry: GeoJSONPolygon; active?: boolean } {
  if (typeof body !== "object" || body === null) throw new Error("Request body must be an object");
  const input = body as { name?: unknown; geometry?: unknown; active?: unknown };

  if (typeof input.name !== "string" || input.name.trim().length === 0) {
    throw new Error("name is required");
  }
  if (!isValidPolygon(input.geometry)) {
    throw new Error("geometry must be a closed GeoJSON Polygon");
  }
  if (input.active !== undefined && typeof input.active !== "boolean") {
    throw new Error("active must be a boolean");
  }

  return {
    name: input.name.trim(),
    geometry: input.geometry,
    active: input.active,
  };
}

router.get("/", async (_req: Request, res: Response) => {
  try {
    const geofences = await Geofence.find().sort({ createdAt: -1 }).lean().exec();
    return res.json({ success: true, count: geofences.length, geofences });
  } catch (error) {
    console.error("Geofence list query failed:", error);
    return res.status(500).json({ success: false, message: "Unable to load geofences" });
  }
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const geofence = await Geofence.create(validateBody(req.body));
    return res.status(201).json({ success: true, geofence });
  } catch (error) {
    if (error instanceof Error && !error.name.includes("Mongo")) {
      return res.status(400).json({ success: false, message: error.message });
    }
    console.error("Geofence creation failed:", error);
    return res.status(500).json({ success: false, message: "Unable to create geofence" });
  }
});

router.put("/:id", async (req: Request, res: Response) => {
  try {
    const update = validateBody(req.body);
    const geofence = await Geofence.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    }).exec();

    if (!geofence) return res.status(404).json({ success: false, message: "Geofence not found" });
    return res.json({ success: true, geofence });
  } catch (error) {
    if (error instanceof Error && (error.name === "CastError" || !error.name.includes("Mongo"))) {
      return res.status(400).json({ success: false, message: error.message });
    }
    console.error("Geofence update failed:", error);
    return res.status(500).json({ success: false, message: "Unable to update geofence" });
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const deleted = await Geofence.findByIdAndDelete(req.params.id).exec();
    if (!deleted) return res.status(404).json({ success: false, message: "Geofence not found" });
    return res.json({ success: true, message: "Geofence deleted" });
  } catch (error) {
    if (error instanceof Error && error.name === "CastError") {
      return res.status(400).json({ success: false, message: "Invalid geofence id" });
    }
    console.error("Geofence deletion failed:", error);
    return res.status(500).json({ success: false, message: "Unable to delete geofence" });
  }
});

export default router;
