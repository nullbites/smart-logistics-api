import { aStar, type AStarOptions } from '../astar';
import { RouteError } from '../../domain/types';
import type { Graph } from '../../domain/types';
import { buildReadmeGraph } from '../../test/fixtures/graph';

function opts(overrides: Partial<AStarOptions> = {}): AStarOptions {
  return {
    vehicle: { weight: 3000, hazardous: false },
    peak: false,
    ...overrides,
  };
}

describe('aStar on the readme graph', () => {
  let graph: Graph;

  beforeEach(() => {
    graph = buildReadmeGraph();
  });

  it('finds the cheapest path off-peak for a light van', () => {
    expect(aStar(graph, 'A', 'E', opts())).toEqual({ path: ['A', 'C', 'D', 'E'], cost: 30 });
  });

  it('applies peak traffic multipliers along the chosen path', () => {
    const result = aStar(graph, 'A', 'E', opts({ peak: true }));
    expect(result?.path).toEqual(['A', 'C', 'D', 'E']);
    // 15*1.5 + 5*1 + 10*1.2 = 39.5
    expect(result?.cost).toBeCloseTo(39.5);
  });

  it('routes around edges the vehicle weight cannot traverse', () => {
    const result = aStar(graph, 'A', 'E', opts({ vehicle: { weight: 6000, hazardous: false } }));
    expect(result).toEqual({ path: ['A', 'B', 'D', 'E'], cost: 32 });
  });

  it('routes around edges barred to hazardous loads', () => {
    const result = aStar(graph, 'A', 'E', opts({ vehicle: { weight: 3000, hazardous: true } }));
    expect(result).toEqual({ path: ['A', 'B', 'D', 'E'], cost: 32 });
  });

  it('returns null when the destination is unreachable', () => {
    expect(aStar(graph, 'E', 'A', opts())).toBeNull();
  });

  it('throws INVALID_NODE for an unknown origin', () => {
    expect.assertions(2);
    try {
      aStar(graph, 'X', 'E', opts());
    } catch (err) {
      expect(err).toBeInstanceOf(RouteError);
      expect((err as RouteError).code).toBe('INVALID_NODE');
    }
  });

  it('throws INVALID_NODE for an unknown destination', () => {
    expect.assertions(2);
    try {
      aStar(graph, 'A', 'Z', opts());
    } catch (err) {
      expect(err).toBeInstanceOf(RouteError);
      expect((err as RouteError).code).toBe('INVALID_NODE');
    }
  });

  it('returns a zero-cost single-node path when origin equals destination', () => {
    expect(aStar(graph, 'A', 'A', opts())).toEqual({ path: ['A'], cost: 0 });
  });

  it('reports each settled node through onExpand, ending with the goal', () => {
    const expanded: string[] = [];
    const result = aStar(graph, 'A', 'E', opts({ onExpand: (key) => expanded.push(key) }));

    expect(result).not.toBeNull();
    expect(expanded[0]).toBe('A');
    expect(expanded[expanded.length - 1]).toBe('E');
    expect(expanded.length).toBeGreaterThanOrEqual(result?.path.length ?? 0);
    expect(new Set(expanded).size).toBe(expanded.length);
  });
});
