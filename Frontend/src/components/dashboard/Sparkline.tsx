import { useId } from 'react';
import type { Tone } from '../../types/dashboard';

interface SparklineProps {
  data: number[];
  tone: Tone;
  width?: number;
  height?: number;
}

export function Sparkline({ data, tone, width = 120, height = 48 }: SparklineProps) {
  // useId() can return characters (like ":" or "«") that are unsafe inside url(#...).
  // Keep letters and digits only.
  const gradientId = `spark-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

  if (data.length < 2) {
    return null;
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1; // avoids dividing by zero when all values are equal
  const padding = 3;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - padding - ((value - min) / range) * (height - padding * 2);
    return { x, y };
  });

  const line = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(' ');
  const area = `${line} L${width} ${height} L0 ${height} Z`;

  return (
    <svg
      className={`fd-spark fd-tone-${tone}`}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.35" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradientId})`} />
      <path
        d={line}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}