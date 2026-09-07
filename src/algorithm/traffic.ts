import type { GraphEdge } from '../domain/types';

export function isPeak(departureTime: string): boolean {
  if (!/^\d{2}:\d{2}$/.test(departureTime)) {
    throw new Error(`Invalid departureTime: ${departureTime}`);
  }
  const [hoursPart, minutesPart] = departureTime.split(':');
  const hours = Number(hoursPart);
  const minutes = Number(minutesPart);
  if (hours > 23 || minutes > 59) {
    throw new Error(`Invalid departureTime: ${departureTime}`);
  }
  const minutesOfDay = hours * 60 + minutes;
  return (
    (minutesOfDay >= 420 && minutesOfDay < 540) || (minutesOfDay >= 1020 && minutesOfDay < 1140)
  );
}

export function effectiveCost(edge: GraphEdge, peak: boolean): number {
  return peak ? edge.cost * (edge.trafficMultiplier ?? 1) : edge.cost;
}
