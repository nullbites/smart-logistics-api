import { canTraverse } from './constraints';
import { effectiveCost } from './traffic';
import { MinHeap } from '../lib/heap';
import { RouteError } from '../domain/types';
import type { Graph, HeuristicFn, PathSegment, VehicleProfile } from '../domain/types';

export interface AStarOptions {
  vehicle: VehicleProfile;
  peak: boolean;
  heuristic?: HeuristicFn;
  /** Called once for each node the search settles on, so a caller can measure search effort. */
  onExpand?: (nodeKey: string) => void;
}

interface OpenEntry {
  key: string;
  g: number;
  f: number;
}

export function aStar(
  graph: Graph,
  fromKey: string,
  toKey: string,
  options: AStarOptions,
): PathSegment | null {
  if (!graph.nodes.has(fromKey)) {
    throw new RouteError('INVALID_NODE', `unknown origin node: ${fromKey}`);
  }
  if (!graph.nodes.has(toKey)) {
    throw new RouteError('INVALID_NODE', `unknown destination node: ${toKey}`);
  }

  if (fromKey === toKey) {
    return { path: [fromKey], cost: 0 };
  }

  const h = (k: string): number => options.heuristic?.(k, toKey) ?? 0;

  const gScore = new Map<string, number>();
  const cameFrom = new Map<string, string>();

  const open = new MinHeap<OpenEntry>((a, b) => {
    if (a.f !== b.f) {
      return a.f - b.f;
    }
    if (a.g !== b.g) {
      return a.g - b.g;
    }
    return a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
  });

  gScore.set(fromKey, 0);
  open.push({ key: fromKey, g: 0, f: h(fromKey) });

  for (;;) {
    const entry = open.pop();
    if (entry === undefined) {
      return null;
    }

    const bestG = gScore.get(entry.key) ?? Infinity;
    if (entry.g > bestG) {
      continue;
    }

    options.onExpand?.(entry.key);

    if (entry.key === toKey) {
      const path: string[] = [toKey];
      let cursor = toKey;
      for (;;) {
        const prev = cameFrom.get(cursor);
        if (prev === undefined) {
          break;
        }
        path.push(prev);
        cursor = prev;
      }
      path.reverse();
      const cost = gScore.get(toKey);
      return { path, cost: cost ?? entry.g };
    }

    const gCurrent = entry.g;
    const neighbors = graph.adjacency.get(entry.key) ?? [];
    for (const edge of neighbors) {
      if (!canTraverse(edge, options.vehicle)) {
        continue;
      }
      const tentative = gCurrent + effectiveCost(edge, options.peak);
      if (tentative < (gScore.get(edge.toKey) ?? Infinity)) {
        cameFrom.set(edge.toKey, entry.key);
        gScore.set(edge.toKey, tentative);
        open.push({ key: edge.toKey, g: tentative, f: tentative + h(edge.toKey) });
      }
    }
  }
}
