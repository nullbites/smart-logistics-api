import { planRoute, type PlanRouteOptions } from '../route';
import type { PathSegment, PlanOutcome, RouteRequest, VehicleProfile } from '../../domain/types';
import { buildReadmeGraph } from '../../test/fixtures/graph';

function vehicle(weight: number, hazardous: boolean): VehicleProfile {
  return { type: 't', weight, hazardous };
}

function request(overrides: Partial<RouteRequest> = {}): RouteRequest {
  return {
    originNodeId: 'A',
    destinationNodeId: 'E',
    vehicleProfile: vehicle(3000, false),
    departureTime: '12:00',
    ...overrides,
  };
}

function expectOk(outcome: PlanOutcome): Extract<PlanOutcome, { ok: true }> {
  if (!outcome.ok) {
    throw new Error(
      `expected ok outcome, got error ${outcome.error.code}: ${outcome.error.message}`,
    );
  }
  return outcome;
}

describe('route', () => {
  it('TC1 standard: routes a light van A -> E off-peak', async () => {
    const outcome = await planRoute(buildReadmeGraph(), request());
    expect(outcome).toEqual({
      ok: true,
      result: { totalCost: 30, path: ['A', 'C', 'D', 'E'], hops: 3 },
    });
  });

  it('TC2 weight constrained: routes a heavy truck around the light edges', async () => {
    const outcome = await planRoute(
      buildReadmeGraph(),
      request({ vehicleProfile: vehicle(6000, false) }),
    );
    expect(outcome).toEqual({
      ok: true,
      result: { totalCost: 32, path: ['A', 'B', 'D', 'E'], hops: 3 },
    });
  });

  it('TC3 hazardous: routes a hazardous load around barred edges', async () => {
    const outcome = await planRoute(
      buildReadmeGraph(),
      request({ vehicleProfile: vehicle(3000, true) }),
    );
    expect(outcome).toEqual({
      ok: true,
      result: { totalCost: 32, path: ['A', 'B', 'D', 'E'], hops: 3 },
    });
  });

  it('honours a waypoint that lies on the unconstrained optimum', async () => {
    const outcome = await planRoute(buildReadmeGraph(), request({ waypoints: ['C'] }));
    expect(outcome).toEqual({
      ok: true,
      result: { totalCost: 30, path: ['A', 'C', 'D', 'E'], hops: 3 },
    });
  });

  it('forces a detour through an ordered waypoint', async () => {
    const outcome = await planRoute(buildReadmeGraph(), request({ waypoints: ['B'] }));
    expect(outcome).toEqual({
      ok: true,
      result: { totalCost: 32, path: ['A', 'B', 'D', 'E'], hops: 3 },
    });
  });

  it('applies peak traffic to the total cost', async () => {
    const outcome = await planRoute(buildReadmeGraph(), request({ departureTime: '08:00' }));
    const ok = expectOk(outcome);
    expect(ok.result.path).toEqual(['A', 'C', 'D', 'E']);
    expect(ok.result.totalCost).toBeCloseTo(39.5);
  });

  it('treats an empty waypoints array like no waypoints', async () => {
    const outcome = await planRoute(buildReadmeGraph(), request({ waypoints: [] }));
    expect(outcome).toEqual({
      ok: true,
      result: { totalCost: 30, path: ['A', 'C', 'D', 'E'], hops: 3 },
    });
  });

  it('returns INVALID_NODE for an unknown origin', async () => {
    const outcome = await planRoute(buildReadmeGraph(), request({ originNodeId: 'X' }));
    expect(outcome.ok).toBe(false);
    if (outcome.ok) {
      throw new Error('expected an error outcome');
    }
    expect(outcome.error.code).toBe('INVALID_NODE');
    expect(typeof outcome.error.message).toBe('string');
    expect(outcome.error.message.length).toBeGreaterThan(0);
  });

  it('returns INVALID_NODE for an unknown waypoint', async () => {
    const outcome = await planRoute(buildReadmeGraph(), request({ waypoints: ['Q'] }));
    expect(outcome.ok).toBe(false);
    if (outcome.ok) {
      throw new Error('expected an error outcome');
    }
    expect(outcome.error.code).toBe('INVALID_NODE');
  });

  it('returns NO_ROUTE when constraints leave no legal path', async () => {
    const outcome = await planRoute(
      buildReadmeGraph(),
      request({ vehicleProfile: vehicle(100000, false) }),
    );
    expect(outcome.ok).toBe(false);
    if (outcome.ok) {
      throw new Error('expected an error outcome');
    }
    expect(outcome.error.code).toBe('NO_ROUTE');
  });

  it('returns NO_ROUTE when a waypoint leg is unreachable', async () => {
    const outcome = await planRoute(
      buildReadmeGraph(),
      request({ waypoints: ['E'], destinationNodeId: 'A' }),
    );
    expect(outcome.ok).toBe(false);
    if (outcome.ok) {
      throw new Error('expected an error outcome');
    }
    expect(outcome.error.code).toBe('NO_ROUTE');
  });

  it('uses an injected segment resolver and stitches legs at the junction', async () => {
    const canned: Record<string, PathSegment> = {
      'A->C': { path: ['A', 'C'], cost: 7 },
      'C->E': { path: ['C', 'D', 'E'], cost: 8 },
    };
    const segmentResolver = jest.fn((fromKey: string, toKey: string) => {
      const segment = canned[`${fromKey}->${toKey}`];
      return segment ?? null;
    });
    const options: PlanRouteOptions = { segmentResolver };

    const outcome = await planRoute(buildReadmeGraph(), request({ waypoints: ['C'] }), options);

    expect(outcome).toEqual({
      ok: true,
      result: { totalCost: 15, path: ['A', 'C', 'D', 'E'], hops: 3 },
    });
    expect(segmentResolver.mock.calls).toEqual([
      ['A', 'C'],
      ['C', 'E'],
    ]);
  });
});
