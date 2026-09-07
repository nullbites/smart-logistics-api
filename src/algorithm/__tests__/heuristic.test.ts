import { computeHeuristicScale, scaledEuclideanHeuristic, zeroHeuristic } from '../heuristic';
import type { GraphNode } from '../../domain/types';
import {
  buildCoordGraph,
  coordEdges,
  coordNodes,
  readmeEdges,
  readmeNodes,
} from '../../test/fixtures/graph';

function nodeMap(nodes: GraphNode[]): Map<string, GraphNode> {
  return new Map(nodes.map((node) => [node.key, node]));
}

describe('zeroHeuristic', () => {
  it('is always zero', () => {
    expect(zeroHeuristic('X', 'Y')).toBe(0);
  });
});

describe('scaledEuclideanHeuristic', () => {
  it('scales the Euclidean distance between two nodes', () => {
    const h = scaledEuclideanHeuristic(2, nodeMap(coordNodes));
    // A(0,0) -> C(3,4): distance 5, scaled by 2 => 10
    expect(h('A', 'C')).toBe(10);
  });

  it('is zero for a node to itself', () => {
    const h = scaledEuclideanHeuristic(1, nodeMap(coordNodes));
    expect(h('A', 'A')).toBe(0);
  });
});

describe('computeHeuristicScale', () => {
  it('is the smallest cost-per-distance ratio when coordinates exist', () => {
    // Every coord edge has cost equal to its Euclidean length, so min ratio is 1.
    expect(computeHeuristicScale(coordNodes, coordEdges)).toBeCloseTo(1);
  });

  it('is null when nodes lack coordinates', () => {
    expect(computeHeuristicScale(readmeNodes, readmeEdges)).toBeNull();
  });

  it('never overestimates the true shortest cost to the goal', () => {
    const graph = buildCoordGraph();
    const scale = graph.heuristicScale ?? 0;
    const h = scaledEuclideanHeuristic(scale, graph.nodes);
    // True shortest cost to D(6,4):
    //   A: A->C->D = 6 + 3 = 9   (A->B->C->D = 10)
    //   B: B->C->D = 4 + 3 = 7
    //   C: C->D = 3
    //   D: 0
    const shortestToD: Record<string, number> = { A: 9, B: 7, C: 3, D: 0 };
    for (const node of coordNodes) {
      const trueCost = shortestToD[node.key];
      expect(trueCost).toBeDefined();
      expect(h(node.key, 'D')).toBeLessThanOrEqual(trueCost as number);
    }
  });
});
