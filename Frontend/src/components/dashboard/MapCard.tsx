import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import { Card } from './Card';
import type { LegendItem } from '../../types/dashboard';

interface MapCardProps {
  onlineCount: number;
  legend: LegendItem[];
  children: ReactNode; // the map element
}

// Maps redraw themselves when the browser fires a "resize" event.
function notifyMapToResize() {
  window.dispatchEvent(new Event('resize'));
}

export function MapCard({ onlineCount, legend, children }: MapCardProps) {
  const slotRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);
  const [expanded, setExpanded] = useState(false);
  const [slotHeight, setSlotHeight] = useState<number | undefined>(undefined);

  function expand() {
    // Remember the height so the page layout does not jump
    // while the card floats above it.
    if (slotRef.current) {
      setSlotHeight(slotRef.current.offsetHeight);
    }
    setExpanded(true);
  }

  function collapse() {
    setExpanded(false);
  }

  // Pressing Esc closes the enlarged map.
  useEffect(() => {
    if (!expanded) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setExpanded(false);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [expanded]);

  // After the card changes size, tell the map to redraw.
  // The second call (after 300ms) catches any late layout changes.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const frame = window.requestAnimationFrame(notifyMapToResize);
    const timer = window.setTimeout(notifyMapToResize, 300);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [expanded]);

  // While expanded, keep the original height so the page layout stays in place.
  const slotStyle: CSSProperties | undefined =
    expanded && slotHeight !== undefined ? { height: slotHeight, flex: 'none' } : undefined;

  const ToggleIcon = expanded ? Minimize2 : Maximize2;

  return (
    <div ref={slotRef} className="fd-map-slot" style={slotStyle}>
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
            <ToggleIcon size={14} aria-hidden="true" />
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