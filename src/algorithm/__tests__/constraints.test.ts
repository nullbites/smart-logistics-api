import { canTraverse } from '../constraints';
import type { GraphEdge, VehicleProfile } from '../../domain/types';

function edge(overrides: Partial<GraphEdge> = {}): GraphEdge {
  return {
    fromKey: 'A',
    toKey: 'B',
    cost: 10,
    ...overrides,
  };
}

function vehicle(overrides: Partial<VehicleProfile> = {}): VehicleProfile {
  return {
    weight: 1000,
    hazardous: false,
    ...overrides,
  };
}

describe('canTraverse', () => {
  describe('weight against edge maxWeight', () => {
    it('allows a vehicle lighter than maxWeight', () => {
      expect(canTraverse(edge({ maxWeight: 2000 }), vehicle({ weight: 1500 }))).toBe(true);
    });

    it('allows a vehicle exactly at maxWeight (boundary uses > not >=)', () => {
      expect(canTraverse(edge({ maxWeight: 2000 }), vehicle({ weight: 2000 }))).toBe(true);
    });

    it('rejects a vehicle heavier than maxWeight', () => {
      expect(canTraverse(edge({ maxWeight: 2000 }), vehicle({ weight: 2001 }))).toBe(false);
    });

    it('allows any weight when maxWeight is null', () => {
      expect(canTraverse(edge({ maxWeight: null }), vehicle({ weight: 999999 }))).toBe(true);
    });

    it('allows any weight when maxWeight is undefined', () => {
      expect(canTraverse(edge({ maxWeight: undefined }), vehicle({ weight: 999999 }))).toBe(true);
    });
  });

  describe('hazardous cargo against edge restrictions', () => {
    it('rejects a hazardous vehicle on a noHazardous edge', () => {
      expect(canTraverse(edge({ noHazardous: true }), vehicle({ hazardous: true }))).toBe(false);
    });

    it('allows a non-hazardous vehicle on a noHazardous edge', () => {
      expect(canTraverse(edge({ noHazardous: true }), vehicle({ hazardous: false }))).toBe(true);
    });

    it('allows a hazardous vehicle when noHazardous is false', () => {
      expect(canTraverse(edge({ noHazardous: false }), vehicle({ hazardous: true }))).toBe(true);
    });

    it('allows a hazardous vehicle when noHazardous is undefined', () => {
      expect(canTraverse(edge({ noHazardous: undefined }), vehicle({ hazardous: true }))).toBe(
        true,
      );
    });
  });

  describe('combined constraints', () => {
    it('rejects when weight is acceptable but hazardous cargo is blocked', () => {
      expect(
        canTraverse(
          edge({ maxWeight: 5000, noHazardous: true }),
          vehicle({ weight: 1000, hazardous: true }),
        ),
      ).toBe(false);
    });
  });
});
