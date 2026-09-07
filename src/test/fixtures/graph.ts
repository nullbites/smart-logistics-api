import { buildGraph } from '../../domain/graph';
import { computeHeuristicScale } from '../../algorithm/heuristic';
import type { Graph, GraphEdge, GraphNode } from '../../domain/types';

export const readmeNodes: GraphNode[] = [
  { key: 'A' },
  { key: 'B' },
  { key: 'C' },
  { key: 'D' },
  { key: 'E' },
];

export const readmeEdges: GraphEdge[] = [
  {
    fromKey: 'A',
    toKey: 'B',
    cost: 10,
    maxWeight: 10000,
    noHazardous: false,
    trafficMultiplier: 1.0,
  },
  {
    fromKey: 'A',
    toKey: 'C',
    cost: 15,
    maxWeight: 5000,
    noHazardous: true,
    trafficMultiplier: 1.5,
  },
  {
    fromKey: 'B',
    toKey: 'D',
    cost: 12,
    maxWeight: 10000,
    noHazardous: false,
    trafficMultiplier: 2.0,
  },
  { fromKey: 'C', toKey: 'D', cost: 5, maxWeight: 5000, noHazardous: true, trafficMultiplier: 1.0 },
  {
    fromKey: 'D',
    toKey: 'E',
    cost: 10,
    maxWeight: 8000,
    noHazardous: false,
    trafficMultiplier: 1.2,
  },
];

export function buildReadmeGraph(): Graph {
  return buildGraph(readmeNodes, readmeEdges);
}

export const coordNodes: GraphNode[] = [
  { key: 'A', x: 0, y: 0 },
  { key: 'B', x: 3, y: 0 },
  { key: 'C', x: 3, y: 4 },
  { key: 'D', x: 6, y: 4 },
];

export const coordEdges: GraphEdge[] = [
  { fromKey: 'A', toKey: 'B', cost: 3 },
  { fromKey: 'B', toKey: 'C', cost: 4 },
  { fromKey: 'A', toKey: 'C', cost: 6 },
  { fromKey: 'C', toKey: 'D', cost: 3 },
];

export function buildCoordGraph(): Graph {
  return buildGraph(coordNodes, coordEdges, computeHeuristicScale(coordNodes, coordEdges));
}
