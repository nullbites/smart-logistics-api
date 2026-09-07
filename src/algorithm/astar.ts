import type { Graph, HeuristicFn, PathSegment, VehicleProfile } from '../domain/types';

export interface AStarOptions {
  vehicle: VehicleProfile;
  peak: boolean;
  heuristic?: HeuristicFn;
}

export function aStar(
  _graph: Graph,
  _fromKey: string,
  _toKey: string,
  _options: AStarOptions,
): PathSegment | null {
  throw new Error('not implemented');
}
