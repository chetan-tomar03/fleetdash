import { FRAME_BYTES_PER_RECORD } from '../config/constants';

export interface DecodedFrame {
  recordCount: number;
  ids: Uint32Array; // read ids[r * 4]
  values: Float32Array; // lat = values[r*4+1], lng = [r*4+2], speed = [r*4+3]
}

export function isValidFrameSize(byteLength: number): boolean {
  return byteLength > 0 && byteLength % FRAME_BYTES_PER_RECORD === 0;
}

// Creates two typed-array views over the SAME memory (no copying).
export function decodeFrame(buffer: ArrayBuffer): DecodedFrame | null {
  if (!isValidFrameSize(buffer.byteLength)) {
    return null;
  }
  return {
    recordCount: buffer.byteLength / FRAME_BYTES_PER_RECORD,
    ids: new Uint32Array(buffer),
    values: new Float32Array(buffer),
  };
}

// Used by the mock generator to build a frame in the same format as the backend.
export function allocateFrame(recordCount: number): {
  buffer: ArrayBuffer;
  ids: Uint32Array;
  values: Float32Array;
} {
  const buffer = new ArrayBuffer(recordCount * FRAME_BYTES_PER_RECORD);
  return { buffer, ids: new Uint32Array(buffer), values: new Float32Array(buffer) };
}