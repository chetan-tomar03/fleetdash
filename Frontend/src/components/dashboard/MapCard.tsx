import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import { Card } from './Card';
import type { LegendItem } from '../../types/dashboard';

interface MapCardProps {
  onlineCount: number;
  legend: LegendItem[];
  children: ReactNode; // your existing map goes here, unchanged
}

export function MapCard({ onlineCount, legend, children }: MapCardProps) {
  const slotRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);
  const [expanded, setExpanded] = useState(false);
  const [slotHeight, setSlotHeight] = useState<number | undefined>(undefined);

  const expand = useCallback(() => {
    // Remember the card's height so the page layout does not jump
    // while the card floats above it.
    if (slotRef.current) {
      setSlotHeight(slotRef.current.offsetHeight);
    }
    setExpanded(true);
  }, []);

  const collapse = useCallback(() => setExpanded(false), []);

  // Esc closes the enlarged map.
  useEffect(() => {
    if (!expanded) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setExpanded(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [expanded]);

  // Tell the map its container changed size (a normal browser resize event).
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const frame = window.requestAnimationFrame(() => {
      window.dispatchEvent(new Event('resize'));
    });
    const timer = window.setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 300);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [expanded]);

  return (
    <div
      ref={slotRef}
      className="fd-map-slot"
      style={expanded && slotHeight !== undefined ? { height: slotHeight, flex: 'none' } : undefined}
    >
      {expanded && <div className="fd-backdrop" onClick={collapse} aria-hidden="true" />}

      <Card
        title="Live Fleet Tracking"
        titleExtra={
          <span className="fd-online">
            <span className="fd-online__dot" />
            {onlineCount} vehicles online
          </span>
        }
        action={
          <button
            type="button"
            className="fd-select"
            onClick={expanded ? collapse : expand}
            aria-expanded={expanded}
          >
            {expanded ? (
              <Minimize2 size={14} aria-hidden="true" />
            ) : (
              <Maximize2 size={14} aria-hidden="true" />
            )}
            {expanded ? 'Collapse' : 'Expand'}
          </button>
        }
        className={`fd-card--fill${expanded ? ' fd-card--expanded' : ''}`}
        bodyClassName="fd-card__body--flush fd-card__body--fill"
      >
        <div
          className={`fd-map-card__map${expanded ? '' : ' is-clickable'}`}
          onClick={expanded ? undefined : expand}
          title={expanded ? undefined : 'Click to enlarge'}
        >
          {children}
        </div>
        <ul className="fd-legend">
          {legend.map((item) => (
            <li key={item.label}>
              <span className={`fd-legend__dot fd-bg-${item.tone}`} />
              {item.label}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}