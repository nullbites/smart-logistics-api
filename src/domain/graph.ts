import type { Graph, GraphEdge, GraphNode, PeakWindow } from './types';

export interface BuildGraphOptions {
  heuristicScale?: number | null;
  peakWindows?: PeakWindow[];
}

export function buildGraph(
  nodes: GraphNode[],
  edges: GraphEdge[],
  options?: BuildGraphOptions,
): Graph {
  const nodeMap = new Map<string, GraphNode>();
  for (const node of nodes) {
    nodeMap.set(node.key, node);
  }

  const adjacency = new Map<string, GraphEdge[]>();
  for (const edge of edges) {
    if (!nodeMap.has(edge.fromKey)) {
      nodeMap.set(edge.fromKey, { key: edge.fromKey });
    }
    if (!nodeMap.has(edge.toKey)) {
      nodeMap.set(edge.toKey, { key: edge.toKey });
    }
    const outgoing = adjacency.get(edge.fromKey);
    if (outgoing === undefined) {
      adjacency.set(edge.fromKey, [edge]);
    } else {
      outgoing.push(edge);
    }
  }

  return {
    nodes: nodeMap,
    adjacency,
    heuristicScale: options?.heuristicScale ?? null,
    peakWindows: options?.peakWindows ?? [],
  };
}
