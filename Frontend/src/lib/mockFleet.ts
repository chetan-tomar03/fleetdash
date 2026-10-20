import { allocateFrame } from './binaryFrame';
import { FRAME_FIELDS_PER_RECORD } from '../config/constants';

// Arbitrary mock area (around Bengaluru).
const BOUNDS = { minLat: 12.8, maxLat: 13.15, minLng: 77.45, maxLng: 77.8 };
const KM_PER_DEGREE = 111;
// Speeds up movement so it is visible on a map later.
const TIME_LAPSE = 30;

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export class MockFleet {
  readonly count: number;
  private lats: Float32Array;
  private lngs: Float32Array;
  private speeds: Float32Array;
  private headings: Float32Array;

  constructor(count: number) {
    this.count = count;
    this.lats = new Float32Array(count);
    this.lngs = new Float32Array(count);
    this.speeds = new Float32Array(count);
    this.headings = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      this.lats[i] = randomBetween(BOUNDS.minLat, BOUNDS.maxLat);
      this.lngs[i] = randomBetween(BOUNDS.minLng, BOUNDS.maxLng);
      // About 10% of vehicles are parked (speed 0).
      this.speeds[i] = Math.random() < 0.1 ? 0 : randomBetween(20, 80);
      this.headings[i] = randomBetween(0, Math.PI * 2);
    }
  }

  // Moves every vehicle forward by dtSeconds of "time".
  step(dtSeconds: number): void {
    for (let i = 0; i < this.count; i++) {
      const speed = this.speeds[i];
      if (speed === 0) continue;

      this.headings[i] += (Math.random() - 0.5) * 0.4;
      const distanceKm = (speed / 3600) * dtSeconds * TIME_LAPSE;
      const heading = this.headings[i];

      let lat = this.lats[i] + (Math.cos(heading) * distanceKm) / KM_PER_DEGREE;
      let lng = this.lngs[i] + (Math.sin(heading) * distanceKm) / KM_PER_DEGREE;

      // Bounce back if the vehicle leaves the area.
      if (lat < BOUNDS.minLat || lat > BOUNDS.maxLat || lng < BOUNDS.minLng || lng > BOUNDS.maxLng) {
        this.headings[i] += Math.PI;
        lat = Math.min(Math.max(lat, BOUNDS.minLat), BOUNDS.maxLat);
        lng = Math.min(Math.max(lng, BOUNDS.minLng), BOUNDS.maxLng);
      }

      this.lats[i] = lat;
      this.lngs[i] = lng;
    }
  }

  // Builds a binary frame in the exact format the backend is expected to send.
  toFrame(): ArrayBuffer {
    const { buffer, ids, values } = allocateFrame(this.count);
    for (let i = 0; i < this.count; i++) {
      const base = i * FRAME_FIELDS_PER_RECORD;
      ids[base] = i + 1;
      values[base + 1] = this.lats[i];
      values[base + 2] = this.lngs[i];
      values[base + 3] = this.speeds[i];
    }
    return buffer;
  }
}