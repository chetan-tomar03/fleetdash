import { useTelemetryStats } from '../hooks/useTelemetryStats';

export function MapArea() {
  const stats = useTelemetryStats(1000);

  return (
    <main className="map-area">
      <div className="map-placeholder">
        <p className="map-title">Map area</p>
        <p className="muted">The Canvas map layer is built in Week 3.</p>
      </div>

      <dl className="stats-overlay" aria-label="Live telemetry statistics">
        <div>
          <dt>Vehicles tracked</dt>
          <dd>{stats.vehicles.toLocaleString()}</dd>
        </div>
        <div>
          <dt>Frames / sec</dt>
          <dd>{stats.framesPerSec}</dd>
        </div>
        <div>
          <dt>Records / sec</dt>
          <dd>{stats.recordsPerSec.toLocaleString()}</dd>
        </div>
        <div>
          <dt>Dropped frames</dt>
          <dd>{stats.droppedFrames}</dd>
        </div>
        <div>
          <dt>App renders</dt>
          <dd>{stats.appRenders}</dd>
        </div>
      </dl>
    </main>
  );
}