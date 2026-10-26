import {
  AlertTriangle,
  BarChart3,
  Home,
  MapPin,
  Route,
  Settings,
  Truck,
  User,
  Wrench,
} from 'lucide-react';
import type {
  CurrentUser,
  FleetVehicleState,
  LegendItem,
  NavItem,
  PerformanceBreakdown,
  RecentTrip,
  RecentVehicle,
  StatCardData,
  Tone,
} from '../types/dashboard';

// Sample data copied from the reference design.
// Replace with real API data when the backend provides it.

export const CURRENT_USER: CurrentUser = {
  name: 'Arjun Kumar R.',
  firstName: 'Arjun',
  role: 'Admin',
  initials: 'AK',
};

export const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: Home },
  { id: 'vehicles', label: 'Vehicles', icon: Truck },
  { id: 'live-tracking', label: 'Live Tracking', icon: MapPin },
  { id: 'trips', label: 'Trips', icon: Route },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'maintenance', label: 'Maintenance', icon: Wrench },
  { id: 'drivers', label: 'Drivers', icon: User },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export const STAT_CARDS: StatCardData[] = [
  {
    id: 'total-vehicles',
    label: 'Total Vehicles',
    value: 12,
    delta: '+2 this week',
    deltaDirection: 'up',
    deltaTone: 'success',
    tone: 'info',
    icon: Truck,
    series: [4, 5, 5, 6, 7, 6, 8, 9, 10, 12],
  },
  {
    id: 'active-drivers',
    label: 'Active Drivers',
    value: 10,
    delta: '+1 today',
    deltaDirection: 'up',
    deltaTone: 'success',
    tone: 'success',
    icon: User,
    series: [3, 4, 3, 5, 6, 5, 7, 8, 7, 10],
  },
  {
    id: 'on-route',
    label: 'On Route',
    value: 8,
    delta: '+2 new',
    deltaDirection: 'up',
    deltaTone: 'success',
    tone: 'primary',
    icon: Route,
    series: [2, 3, 3, 4, 3, 5, 5, 6, 7, 8],
  },
  {
    id: 'maintenance-due',
    label: 'Maintenance Due',
    value: 2,
    delta: '-1 this week',
    deltaDirection: 'down',
    deltaTone: 'error',
    tone: 'error',
    icon: AlertTriangle,
    series: [1, 1, 2, 1, 2, 2, 3, 2, 3, 2],
  },
];

export const ONLINE_VEHICLES = 8;

export const VEHICLE_STATE_META: Record<FleetVehicleState, { label: string; tone: Tone }> = {
  moving: { label: 'Moving', tone: 'success' },
  idle: { label: 'Idle', tone: 'info' },
  stopped: { label: 'Stopped', tone: 'warning' },
  maintenance: { label: 'Maintenance', tone: 'error' },
};

// The map legend reuses the vehicle state list above.
export const MAP_LEGEND: LegendItem[] = Object.values(VEHICLE_STATE_META);

export const PERFORMANCE: PerformanceBreakdown = {
  onTime: 78,
  delayed: 12,
  cancelled: 5,
  totalTrips: 96,
};

export const RECENT_VEHICLES: RecentVehicle[] = [
  { id: 'v1', plate: 'TN 45 AB 1234', driver: 'Rakesh', state: 'moving', location: 'Coimbatore', updated: '2 min ago' },
  { id: 'v2', plate: 'TN 38 CD 5678', driver: 'Suresh', state: 'moving', location: 'Avinashi', updated: '5 min ago' },
  { id: 'v3', plate: 'TN 72 EF 9012', driver: 'Vijay', state: 'idle', location: 'Tiruppur', updated: '12 min ago' },
  { id: 'v4', plate: 'TN 09 GH 3456', driver: 'Karthik', state: 'moving', location: 'Pollachi', updated: '18 min ago' },
  { id: 'v5', plate: 'TN 55 IJ 7890', driver: 'Mohan', state: 'maintenance', location: 'Erode', updated: '32 min ago' },
];

export const RECENT_TRIPS: RecentTrip[] = [
  { id: 't1', plate: 'TN 45 AB 1234', from: 'Coimbatore', to: 'Chennai', status: 'On Time', time: 'Today, 09:15 AM' },
  { id: 't2', plate: 'TN 38 CD 5678', from: 'Salem', to: 'Bangalore', status: 'On Time', time: 'Today, 08:42 AM' },
  { id: 't3', plate: 'TN 72 EF 9012', from: 'Tiruppur', to: 'Coimbatore', status: 'Delayed', time: 'Today, 07:20 AM' },
  { id: 't4', plate: 'TN 09 GH 3456', from: 'Madurai', to: 'Coimbatore', status: 'On Time', time: 'Today, 06:50 AM' },
];