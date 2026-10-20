import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { SOCKET_EVENTS } from '../config/constants';
import { telemetryStore } from '../store/telemetryStore';
import type { ConnectionStatus } from '../types/telemetry';

// Connects to the backend. Only the connection STATUS is React state.
// Incoming frames go straight into telemetryStore (no re-render per message).
export function useTelemetrySocket(url: string, enabled: boolean): ConnectionStatus {
  const [status, setStatus] = useState<ConnectionStatus>('connecting');

  useEffect(() => {
    if (!enabled) return;

    telemetryStore.reset();

    const socket = io(url, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socket.on('connect', () => setStatus('connected'));
    socket.on('disconnect', () => setStatus('disconnected'));
    socket.on('connect_error', () => setStatus('error'));
    socket.io.on('reconnect_attempt', () => setStatus('connecting'));

    socket.on(SOCKET_EVENTS.TELEMETRY_FRAME, (payload: unknown) => {
      if (payload instanceof ArrayBuffer) {
        telemetryStore.applyFrame(payload);
      } else {
        telemetryStore.droppedFrames += 1;
      }
    });

    return () => {
      socket.removeAllListeners();
      socket.io.removeAllListeners();
      socket.disconnect();
    };
  }, [url, enabled]);

  return status;
}