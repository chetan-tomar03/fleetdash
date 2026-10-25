import { Truck } from 'lucide-react';
import { NAV_ITEMS } from '../../data/dashboardMock';

// There is no router yet, so "Dashboard" is always the active item.
// When routes are added, replace this with the current route.
const ACTIVE_ITEM_ID = 'dashboard';

export function SidebarNav() {
  return (
    <aside className="fd-sidebar">
      <div className="fd-logo">
        <span className="fd-logo__mark">
          <Truck size={22} aria-hidden="true" />
        </span>
        <span className="fd-logo__text">
          Fleet<span>Dash</span>
        </span>
      </div>

      <nav aria-label="Main navigation">
        <ul className="fd-nav">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = item.id === ACTIVE_ITEM_ID;

            return (
              <li key={item.id}>
                <button
                  type="button"
                  className={`fd-nav__item${isActive ? ' is-active' : ''}`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon size={18} aria-hidden="true" />
                  <span>{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="fd-sidebar__footer">
        <p>
          Smarter Fleet.
          <br />
          Safer Journeys.
          <br />
          <span>Better Tomorrow.</span>
        </p>
        <div className="fd-sidebar__bar" />
      </div>
    </aside>
  );
}