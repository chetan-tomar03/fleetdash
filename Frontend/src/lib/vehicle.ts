import { MOVING_SPEED_THRESHOLD } from '../config/constants';

export function vehicleName(id: number): string {
  return `Truck-${id}`;
}

export function isMoving(speed: number): boolean {
  return speed > MOVING_SPEED_THRESHOLD;
}