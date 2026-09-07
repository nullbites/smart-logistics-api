import type { GraphEdge, GraphNode, HeuristicFn } from '../domain/types';

export const zeroHeuristic: HeuristicFn = () => 0;

function hasCoords(node: GraphNode | undefined): node is GraphNode & { x: number; y: number } {
  return node !== undefined && typeof node.x === 'number' && typeof node.y === 'number';
}

export function scaledEuclideanHeuristic(
  scale: number,
  nodes: Map<string, GraphNode>,
): HeuristicFn {
  return (nodeKey: string, goalKey: string): number => {
    const node = nodes.get(nodeKey);
    const goal = nodes.get(goalKey);
    if (!hasCoords(node) || !hasCoords(goal)) {
      return 0;
    }
    return scale * Math.hypot(node.x - goal.x, node.y - goal.y);
  };
}

export function computeHeuristicScale(nodes: GraphNode[], edges: GraphEdge[]): number | null {
  const lookup = new Map<string, GraphNode>();
  for (const node of nodes) {
    lookup.set(node.key, node);
  }

  if (edges.length === 0) {
    return null;
  }

  let minRatio: number | null = null;
  for (const edge of edges) {
    const from = lookup.get(edge.fromKey);
    const to = lookup.get(edge.toKey);
    if (!hasCoords(from) || !hasCoords(to)) {
      return null;
    }
    const len = Math.hypot(from.x - to.x, from.y - to.y);
    if (len > 0) {
      const ratio = edge.cost / len;
      if (minRatio === null || ratio < minRatio) {
        minRatio = ratio;
      }
    }
  }

  return minRatio;
}
