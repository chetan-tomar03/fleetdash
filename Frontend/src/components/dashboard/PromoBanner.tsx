import { MapPin, Settings, TrendingUp } from 'lucide-react';

export function PromoBanner() {
  return (
    <section className="fd-card fd-promo">
      <h2>
        Efficient Fleet Management
        <br />
        for a Connected Future
      </h2>
      <div className="fd-promo__bar" />
      <ul className="fd-promo__actions">
        <li>
          <MapPin size={16} aria-hidden="true" />
          Track
        </li>
        <li>
          <Settings size={16} aria-hidden="true" />
          Manage
        </li>
        <li>
          <TrendingUp size={16} aria-hidden="true" />
          Grow
        </li>
      </ul>
    </section>
  );
}