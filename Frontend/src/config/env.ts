function readPositiveNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const env = {
  // Mock is ON unless VITE_USE_MOCK is exactly "false".
  useMock: import.meta.env.VITE_USE_MOCK !== 'false',
  socketUrl: import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:5000',
  mockVehicleCount: readPositiveNumber(import.meta.env.VITE_MOCK_VEHICLE_COUNT, 3000),
  mockHz: readPositiveNumber(import.meta.env.VITE_MOCK_HZ, 10),
} as const;