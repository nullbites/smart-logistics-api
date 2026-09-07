import { effectiveCost, isPeak } from '../traffic';
import type { GraphEdge, PeakWindow } from '../../domain/types';

const defaultWindows: PeakWindow[] = [
  { startMinute: 420, endMinute: 540 },
  { startMinute: 1020, endMinute: 1140 },
];

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
    expect(isPeak(time, defaultWindows)).toBe(expected);
  });

  it('is never peak when the window list is empty', () => {
    expect(isPeak('08:00', [])).toBe(false);
  });

  it('matches inside a single custom window (12:00-13:00)', () => {
    const w: PeakWindow[] = [{ startMinute: 720, endMinute: 780 }];
    expect(isPeak('12:00', w)).toBe(true);
    expect(isPeak('12:59', w)).toBe(true);
    expect(isPeak('13:00', w)).toBe(false);
    expect(isPeak('08:00', w)).toBe(false);
  });

  it('matches inside a window that wraps past midnight (22:00-02:00)', () => {
    const w: PeakWindow[] = [{ startMinute: 1320, endMinute: 120 }];
    expect(isPeak('22:00', w)).toBe(true);
    expect(isPeak('23:30', w)).toBe(true);
    expect(isPeak('00:30', w)).toBe(true);
    expect(isPeak('01:59', w)).toBe(true);
    expect(isPeak('02:00', w)).toBe(false);
    expect(isPeak('12:00', w)).toBe(false);
  });

  it('still throws on a malformed time', () => {
    expect(() => isPeak('nope', defaultWindows)).toThrow('Invalid departureTime: nope');
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
