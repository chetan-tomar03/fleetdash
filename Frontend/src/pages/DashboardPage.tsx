import type { ReactNode } from 'react';
import { CalendarDays } from 'lucide-react';
import '../styles/dashboard.css';
import { MapCard } from '../components/dashboard/MapCard';
import { PerformanceCard } from '../components/dashboard/PerformanceCard';
import { PromoBanner } from '../components/dashboard/PromoBanner';
import { RecentTripsCard } from '../components/dashboard/RecentTripsCard';
import { RecentVehiclesTable } from '../components/dashboard/RecentVehiclesTable';
import { SidebarNav } from '../components/dashboard/SidebarNav';
import { StatCard } from '../components/dashboard/StatCard';
import { TopBar } from '../components/dashboard/TopBar';
import {
  CURRENT_USER,
  MAP_LEGEND,
  ONLINE_VEHICLES,
  PERFORMANCE,
  RECENT_TRIPS,
  RECENT_VEHICLES,
  STAT_CARDS,
} from '../data/dashboardMock';
import type { ConnectionStatus } from '../types/telemetry';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function getGreeting(hour: number): string {
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

function formatDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  return `${DAYS[date.getDay()]}, ${day} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

interface DashboardPageProps {
  status: ConnectionStatus;
  map: ReactNode; // your existing, untouched map element
}

export function DashboardPage({ status, map }: DashboardPageProps) {
  const now = new Date();

  return (
    <div className="fd-shell">
      <SidebarNav />

      <div className="fd-content">
        <TopBar status={status} />

        <div className="fd-page">
          <div className="fd-welcome">
            <div>
              <h1>
                {getGreeting(now.getHours())}, {CURRENT_USER.firstName}{' '}
                <span aria-hidden="true">👋</span>
              </h1>
              <p>Here&apos;s what&apos;s happening with your fleet today.</p>
            </div>
            <div className="fd-date">
              <span>{formatDate(now)}</span>
              <CalendarDays size={18} aria-hidden="true" />
            </div>
          </div>

          <section className="fd-stats" aria-label="Fleet summary">
            {STAT_CARDS.map((card) => (
              <StatCard key={card.id} data={card} />
            ))}
          </section>

          <div className="fd-grid">
            <div className="fd-col">
              <MapCard onlineCount={ONLINE_VEHICLES} legend={MAP_LEGEND}>
                {map}
              </MapCard>
              <RecentVehiclesTable vehicles={RECENT_VEHICLES} />
            </div>

            <div className="fd-col">
              <PerformanceCard data={PERFORMANCE} />
              <RecentTripsCard trips={RECENT_TRIPS} />
              <PromoBanner />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}