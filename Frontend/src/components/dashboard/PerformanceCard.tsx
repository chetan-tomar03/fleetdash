import { ChevronDown } from 'lucide-react';
import { Card } from './Card';
import { DonutChart } from './DonutChart';
import type { PerformanceBreakdown, Tone } from '../../types/dashboard';

interface PerformanceCardProps {
  data: PerformanceBreakdown;
}

interface PercentShare {
  label: string;
  percent: number;
  tone: Tone;
}

interface BreakdownRow {
  label: string;
  value: string;
  tone: Tone;
}

export function PerformanceCard({ data }: PerformanceCardProps) {
  // This one list feeds both the donut chart and the breakdown list.
  const shares: PercentShare[] = [
    { label: 'On Time', percent: data.onTime, tone: 'success' },
    { label: 'Delayed', percent: data.delayed, tone: 'info' },
    { label: 'Cancelled', percent: data.cancelled, tone: 'warning' },
  ];

  const segments = shares.map((share) => ({ value: share.percent, tone: share.tone }));

  const rows: BreakdownRow[] = [
    ...shares.map((share) => ({
      label: share.label,
      value: `${share.percent}%`,
      tone: share.tone,
    })),
    { label: 'Total Trips', value: String(data.totalTrips), tone: 'muted' },
  ];

  return (
    <Card
      title="Fleet Performance"
      action={
        <button type="button" className="fd-select">
          This Week
          <ChevronDown size={14} aria-hidden="true" />
        </button>
      }
    >
      <div className="fd-performance">
        <DonutChart
          segments={segments}
          centerValue={`${data.onTime}%`}
          centerLabel="On-Time Delivery"
          size={124}
          thickness={11}
        />
        <ul className="fd-breakdown">
          {rows.map((row) => (
            <li key={row.label}>
              <span className="fd-breakdown__label">
                <span className={`fd-breakdown__dot fd-bg-${row.tone}`} />
                {row.label}
              </span>
              <strong>{row.value}</strong>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}