import type { LucideIcon } from 'lucide-react';

export type Tone = 'primary' | 'success' | 'warning' | 'error' | 'info' | 'muted';

export interface StatCardData {
  id: string;
  label: string;
  value: number;
  delta: string;
  deltaDirection: 'up' | 'down';
  deltaTone: Tone;
  tone: Tone;
  icon: LucideIcon;
  series: number[];
}

export type FleetVehicleState = 'moving' | 'idle' | 'stopped' | 'maintenance';

export interface RecentVehicle {
  id: string;
  plate: string;
  driver: string;
  state: FleetVehicleState;
  location: string;
  updated: string;
}

export type TripStatus = 'On Time' | 'Delayed';

export interface RecentTrip {
  id: string;
  plate: string;
  from: string;
  to: string;
  status: TripStatus;
  time: string;
}

export interface PerformanceBreakdown {
  onTime: number;
  delayed: number;
  cancelled: number;
  totalTrips: number;
}

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

export interface LegendItem {
  label: string;
  tone: Tone;
}

export interface CurrentUser {
  name: string;
  firstName: string;
  role: string;
  initials: string;
}