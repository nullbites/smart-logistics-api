import { aStar } from './astar';
import { scaledEuclideanHeuristic, zeroHeuristic } from './heuristic';
import { isPeak } from './traffic';
import { RouteError } from '../domain/types';
import type { Graph, PlanOutcome, RouteRequest, SegmentResolver } from '../domain/types';

export interface PlanRouteOptions {
  segmentResolver?: SegmentResolver;
}

export async function planRoute(
  graph: Graph,
  request: RouteRequest,
  options?: PlanRouteOptions,
): Promise<PlanOutcome> {
  const peak = isPeak(request.departureTime);
  const heuristic =
    graph.heuristicScale != null
      ? scaledEuclideanHeuristic(graph.heuristicScale, graph.nodes)
      : zeroHeuristic;
  const resolve: SegmentResolver =
    options?.segmentResolver ??
    ((fromKey, toKey) =>
      aStar(graph, fromKey, toKey, { vehicle: request.vehicleProfile, peak, heuristic }));

  const stops = [request.originNodeId, ...(request.waypoints ?? []), request.destinationNodeId];

  let totalCost = 0;
  const path: string[] = [];

  try {
    for (let i = 0; i < stops.length - 1; i += 1) {
      const from = stops[i];
      const to = stops[i + 1];
      if (from === undefined || to === undefined) {
        throw new Error('unreachable: stop index out of range');
      }

      const segment = await resolve(from, to);
      if (segment === null) {
        return {
          ok: false,
          error: { code: 'NO_ROUTE', message: `no route from ${from} to ${to}` },
        };
      }

      totalCost += segment.cost;
      if (path.length === 0) {
        path.push(...segment.path);
      } else {
        path.push(...segment.path.slice(1));
      }
    }
  } catch (err) {
    if (err instanceof RouteError) {
      return { ok: false, error: { code: err.code, message: err.message } };
    }
    throw err;
  }

  return {
    ok: true,
    result: { totalCost, path, hops: path.length > 0 ? path.length - 1 : 0 },
  };
}
