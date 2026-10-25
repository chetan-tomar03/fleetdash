import { Truck } from 'lucide-react';
import { Card } from './Card';
import { StatusBadge } from './StatusBadge';
import { ViewAllButton } from './ViewAllButton';
import type { RecentTrip } from '../../types/dashboard';

interface RecentTripsCardProps {
  trips: RecentTrip[];
}

export function RecentTripsCard({ trips }: RecentTripsCardProps) {
  return (
    <Card title="Recent Trips" className="fd-card--fill" action={<ViewAllButton />}>
      {trips.length === 0 ? (
        <div className="fd-empty">No trips yet today.</div>
      ) : (
        <ul className="fd-trips">
          {trips.map((trip) => (
            <li key={trip.id} className="fd-trip">
              <span className="fd-trip__icon">
                <Truck size={16} aria-hidden="true" />
              </span>
              <div>
                <p className="fd-trip__plate">{trip.plate}</p>
                <p className="fd-trip__route">
                  {trip.from} → {trip.to}
                </p>
              </div>
              <StatusBadge tone={trip.status === 'On Time' ? 'success' : 'info'}>
                {trip.status}
              </StatusBadge>
              <span className="fd-trip__time">{trip.time}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}