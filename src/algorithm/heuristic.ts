import type { GraphEdge, GraphNode, HeuristicFn } from '../domain/types';

export const zeroHeuristic: HeuristicFn = () => 0;

export function scaledEuclideanHeuristic(
  _scale: number,
  _nodes: Map<string, GraphNode>,
): HeuristicFn {
  throw new Error('not implemented');
}

export function computeHeuristicScale(_nodes: GraphNode[], _edges: GraphEdge[]): number | null {
  throw new Error('not implemented');
}
