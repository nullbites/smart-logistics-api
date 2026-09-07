import type { GraphEdge, PeakWindow } from '../domain/types';
import { parseHhMm } from '../lib/time';

export function isPeak(departureTime: string, windows: PeakWindow[]): boolean {
  const t = parseHhMm(departureTime);
  return windows.some((w) =>
    w.startMinute <= w.endMinute
      ? t >= w.startMinute && t < w.endMinute
      : t >= w.startMinute || t < w.endMinute,
  );
}

export function effectiveCost(edge: GraphEdge, peak: boolean): number {
  return peak ? edge.cost * (edge.trafficMultiplier ?? 1) : edge.cost;
}
