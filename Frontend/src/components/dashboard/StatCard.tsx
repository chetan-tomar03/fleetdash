import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { Sparkline } from './Sparkline';
import type { StatCardData } from '../../types/dashboard';

interface StatCardProps {
  data: StatCardData;
}

export function StatCard({ data }: StatCardProps) {
  const Icon = data.icon;
  const DeltaIcon = data.deltaDirection === 'up' ? ArrowUpRight : ArrowDownRight;

  return (
    <article className="fd-card fd-stat">
      <div className={`fd-stat__icon fd-bg-${data.tone}`}>
        <Icon size={22} aria-hidden="true" />
      </div>
      <div className="fd-stat__body">
        <p className="fd-stat__label">{data.label}</p>
        <p className="fd-stat__value">{data.value}</p>
        <p className={`fd-stat__delta fd-tone-${data.deltaTone}`}>
          <DeltaIcon size={14} aria-hidden="true" />
          {data.delta}
        </p>
      </div>
      <Sparkline data={data.series} tone={data.tone} />
    </article>
  );
}