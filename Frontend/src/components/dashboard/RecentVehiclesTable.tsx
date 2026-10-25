import { Truck } from 'lucide-react';
import { Card } from './Card';
import { StatusBadge } from './StatusBadge';
import { ViewAllButton } from './ViewAllButton';
import { VEHICLE_STATE_META } from '../../data/dashboardMock';
import type { RecentVehicle } from '../../types/dashboard';

interface RecentVehiclesTableProps {
  vehicles: RecentVehicle[];
}

export function RecentVehiclesTable({ vehicles }: RecentVehiclesTableProps) {
  return (
    <Card title="Recent Vehicles" action={<ViewAllButton />}>
      {vehicles.length === 0 ? (
        <div className="fd-empty">No recent vehicles.</div>
      ) : (
        <div className="fd-table-wrap">
          <table className="fd-table">
            <thead>
              <tr>
                <th scope="col">Vehicle No.</th>
                <th scope="col">Driver</th>
                <th scope="col">Status</th>
                <th scope="col">Location</th>
                <th scope="col">Last Updated</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((vehicle) => {
                const stateMeta = VEHICLE_STATE_META[vehicle.state];
                const iconTone = vehicle.state === 'maintenance' ? 'error' : 'info';

                return (
                  <tr key={vehicle.id}>
                    <td>
                      <span className="fd-vehicle-cell">
                        <span className={`fd-vehicle-icon fd-bg-${iconTone}`}>
                          <Truck size={14} aria-hidden="true" />
                        </span>
                        {vehicle.plate}
                      </span>
                    </td>
                    <td>{vehicle.driver}</td>
                    <td>
                      <StatusBadge tone={stateMeta.tone}>{stateMeta.label}</StatusBadge>
                    </td>
                    <td>{vehicle.location}</td>
                    <td>{vehicle.updated}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}