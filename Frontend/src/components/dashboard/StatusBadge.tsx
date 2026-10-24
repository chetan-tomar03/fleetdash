import type { ReactNode } from 'react';
import type { Tone } from '../../types/dashboard';

interface StatusBadgeProps {
  tone: Tone;
  children: ReactNode;
}

export function StatusBadge({ tone, children }: StatusBadgeProps) {
  return <span className={`fd-badge fd-badge--${tone}`}>{children}</span>;
}