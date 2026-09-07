import type { Graph, PlanOutcome, RouteRequest, SegmentResolver } from '../domain/types';

export interface PlanRouteOptions {
  segmentResolver?: SegmentResolver;
}

export async function planRoute(
  _graph: Graph,
  _request: RouteRequest,
  _options?: PlanRouteOptions,
): Promise<PlanOutcome> {
  throw new Error('not implemented');
}
