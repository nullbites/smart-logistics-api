import { buildGraph } from '../graph';
import type { GraphEdge, GraphNode } from '../types';
import { readmeEdges, readmeNodes } from '../../test/fixtures/graph';

describe('buildGraph', () => {
  it('returns nodes as a Map containing every node key', () => {
    const graph = buildGraph(readmeNodes, readmeEdges);
    expect(graph.nodes).toBeInstanceOf(Map);
    for (const node of readmeNodes) {
      expect(graph.nodes.has(node.key)).toBe(true);
    }
    expect(graph.nodes.size).toBe(readmeNodes.length);
  });

  it('keys adjacency by origin node with exactly the outgoing edges', () => {
    const graph = buildGraph(readmeNodes, readmeEdges);
    const fromA = graph.adjacency.get('A') ?? [];
    expect(fromA.map((edge) => edge.toKey).sort()).toEqual(['B', 'C']);
  });

  it('has no outgoing edges for a sink node', () => {
    const graph = buildGraph(readmeNodes, readmeEdges);
    expect((graph.adjacency.get('E') ?? []).length).toBe(0);
  });

  it('tolerates an edge endpoint that is absent from the node list', () => {
    const nodes: GraphNode[] = [{ key: 'A' }];
    const edges: GraphEdge[] = [{ fromKey: 'A', toKey: 'GHOST', cost: 1 }];
    expect(() => buildGraph(nodes, edges)).not.toThrow();
    const graph = buildGraph(nodes, edges);
    expect((graph.adjacency.get('A') ?? []).map((edge) => edge.toKey)).toEqual(['GHOST']);
  });

  it('passes heuristicScale through to the graph', () => {
    const graph = buildGraph(readmeNodes, readmeEdges, { heuristicScale: 0.25 });
    expect(graph.heuristicScale).toBe(0.25);
  });

  it('defaults heuristicScale to null and peakWindows to an empty list', () => {
    const graph = buildGraph(readmeNodes, readmeEdges);
    expect(graph.heuristicScale).toBeNull();
    expect(graph.peakWindows).toEqual([]);
  });

  it('keeps peakWindows empty when only heuristicScale is given', () => {
    const graph = buildGraph(readmeNodes, readmeEdges, { heuristicScale: 2 });
    expect(graph.heuristicScale).toBe(2);
    expect(graph.peakWindows).toEqual([]);
  });

  it('passes peakWindows through to the graph', () => {
    const graph = buildGraph(readmeNodes, readmeEdges, {
      peakWindows: [{ startMinute: 1, endMinute: 2 }],
    });
    expect(graph.peakWindows).toEqual([{ startMinute: 1, endMinute: 2 }]);
  });
});
