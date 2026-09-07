import { effectiveCost, isPeak } from '../traffic';
import type { GraphEdge } from '../../domain/types';

function edge(overrides: Partial<GraphEdge> = {}): GraphEdge {
  return {
    fromKey: 'A',
    toKey: 'B',
    cost: 10,
    ...overrides,
  };
}

describe('isPeak', () => {
  it.each([
    ['07:00', true],
    ['08:30', true],
    ['08:59', true],
    ['09:00', false],
    ['12:00', false],
    ['17:00', true],
    ['18:59', true],
    ['19:00', false],
    ['06:59', false],
    ['00:00', false],
    ['23:59', false],
  ])('treats %s as peak=%s', (time, expected) => {
    expect(isPeak(time)).toBe(expected);
  });
});

describe('effectiveCost', () => {
  it('returns the edge cost unchanged off-peak', () => {
    expect(effectiveCost(edge({ cost: 10, trafficMultiplier: 1.5 }), false)).toBe(10);
  });

  it('applies the multiplier to the edge cost during peak', () => {
    expect(effectiveCost(edge({ cost: 10, trafficMultiplier: 1.5 }), true)).toBeCloseTo(15);
  });

  it('applies a non-integer product during peak', () => {
    expect(effectiveCost(edge({ cost: 7, trafficMultiplier: 1.25 }), true)).toBeCloseTo(8.75);
  });

  it('treats an undefined multiplier as 1 during peak', () => {
    expect(effectiveCost(edge({ cost: 10, trafficMultiplier: undefined }), true)).toBe(10);
  });
});
