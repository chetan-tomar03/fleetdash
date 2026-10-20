import { decodeFrame } from '../lib/binaryFrame';
import { FRAME_FIELDS_PER_RECORD } from '../config/constants';
import type { VehiclePosition } from '../types/telemetry';

const INITIAL_CAPACITY = 1024;

// Plain (non-React) store holding the latest position of every vehicle.
// Column arrays are indexed by "slot". slot 0..count-1 are valid vehicles.
// NOTE: arrays are replaced when they grow, so always read
// telemetryStore.lats (etc.) fresh; never keep your own reference for long.
export class TelemetryStore {
  ids = new Uint32Array(INITIAL_CAPACITY);
  lats = new Float32Array(INITIAL_CAPACITY);
  lngs = new Float32Array(INITIAL_CAPACITY);
  speeds = new Float32Array(INITIAL_CAPACITY);
  count = 0;

  framesReceived = 0;
  recordsReceived = 0;
  droppedFrames = 0;

  private capacity = INITIAL_CAPACITY;
  private slotById = new Map<number, number>(); // vehicle id -> slot

  // Decodes one binary frame and updates latest positions. No React involved.
  applyFrame(buffer: ArrayBuffer): boolean {
    const frame = decodeFrame(buffer);
    if (!frame) {
      this.droppedFrames += 1;
      return false;
    }

    const { recordCount, ids, values } = frame;
    for (let r = 0; r < recordCount; r++) {
      const base = r * FRAME_FIELDS_PER_RECORD;
      const id = ids[base];
      let slot = this.slotById.get(id);
      if (slot === undefined) {
        slot = this.allocateSlot(id);
      }
      this.lats[slot] = values[base + 1];
      this.lngs[slot] = values[base + 2];
      this.speeds[slot] = values[base + 3];
    }

    this.framesReceived += 1;
    this.recordsReceived += recordCount;
    return true;
  }

  // Lookup: vehicle id -> latest position.
  getVehicle(id: number): VehiclePosition | undefined {
    const slot = this.slotById.get(id);
    if (slot === undefined) return undefined;
    return {
      id,
      lat: this.lats[slot],
      lng: this.lngs[slot],
      speed: this.speeds[slot],
    };
  }

  reset(): void {
    this.count = 0;
    this.slotById.clear();
    this.framesReceived = 0;
    this.recordsReceived = 0;
    this.droppedFrames = 0;
  }

  private allocateSlot(id: number): number {
    if (this.count === this.capacity) {
      this.grow();
    }
    const slot = this.count;
    this.count += 1;
    this.ids[slot] = id;
    this.slotById.set(id, slot);
    return slot;
  }

  private grow(): void {
    const newCapacity = this.capacity * 2;

    const ids = new Uint32Array(newCapacity);
    ids.set(this.ids);
    this.ids = ids;

    const lats = new Float32Array(newCapacity);
    lats.set(this.lats);
    this.lats = lats;

    const lngs = new Float32Array(newCapacity);
    lngs.set(this.lngs);
    this.lngs = lngs;

    const speeds = new Float32Array(newCapacity);
    speeds.set(this.speeds);
    this.speeds = speeds;

    this.capacity = newCapacity;
  }
}

export const telemetryStore = new TelemetryStore();