/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_USE_MOCK?: string;
  readonly VITE_SOCKET_URL?: string;
  readonly VITE_MOCK_VEHICLE_COUNT?: string;
  readonly VITE_MOCK_HZ?: string;
}