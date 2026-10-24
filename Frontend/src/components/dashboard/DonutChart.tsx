import type { Tone } from '../../types/dashboard';

export interface DonutSegment {
  value: number; // percent of the full ring (0-100)
  tone: Tone;
}

interface DonutChartProps {
  segments: DonutSegment[];
  centerValue: string;
  centerLabel: string;
  size?: number;
  thickness?: number;
}

export function DonutChart({
  segments,
  centerValue,
  centerLabel,
  size = 150,
  thickness = 12,
}: DonutChartProps) {
  const center = size / 2;
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;

  let offset = 0;
  const arcs = segments.map((segment) => {
    const length = (segment.value / 100) * circumference;
    const arc = (
      <circle
        key={segment.tone}
        className={`fd-tone-${segment.tone}`}
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={thickness}
        strokeDasharray={`${length} ${circumference - length}`}
        strokeDashoffset={-offset}
      />
    );
    offset += length;
    return arc;
  });

  return (
    <div className="fd-donut" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <g transform={`rotate(-90 ${center} ${center})`}>
          <circle
            className="fd-donut__track"
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={thickness}
          />
          {arcs}
        </g>
      </svg>
      <div className="fd-donut__center">
        <span className="fd-donut__value">{centerValue}</span>
        <span className="fd-donut__label">{centerLabel}</span>
      </div>
    </div>
  );
}