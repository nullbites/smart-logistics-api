import type { GraphEdge, PeakWindow } from '../domain/types';

export function isPeak(departureTime: string, windows: PeakWindow[]): boolean {
  if (!/^\d{2}:\d{2}$/.test(departureTime)) {
    throw new Error(`Invalid departureTime: ${departureTime}`);
  }
  const [hoursPart, minutesPart] = departureTime.split(':');
  const hours = Number(hoursPart);
  const minutes = Number(minutesPart);
  if (hours > 23 || minutes > 59) {
    throw new Error(`Invalid departureTime: ${departureTime}`);
  }
  const t = hours * 60 + minutes;
  return windows.some((w) =>
    w.startMinute <= w.endMinute
      ? t >= w.startMinute && t < w.endMinute
      : t >= w.startMinute || t < w.endMinute,
  );
}

export function effectiveCost(edge: GraphEdge, peak: boolean): number {
  return peak ? edge.cost * (edge.trafficMultiplier ?? 1) : edge.cost;
}
