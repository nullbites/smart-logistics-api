import { performance } from 'node:perf_hooks';
import type { Logger } from 'pino';
import { aStar } from '../algorithm/astar';
import { scaledEuclideanHeuristic, zeroHeuristic } from '../algorithm/heuristic';
import { planRoute } from '../algorithm/route';
import { isPeak } from '../algorithm/traffic';
import { prisma } from '../db/client';
import { buildGraph } from '../domain/graph';
import type { Graph, RouteRequest, SegmentResolver } from '../domain/types';
import { logger } from '../lib/logger';
import { appendLog, getJob, markCompleted, markFailed } from './job.service';

export async function loadGraph(networkId: string): Promise<Graph | null> {
  const net = await prisma.network.findUnique({
    where: { id: networkId },
    include: { nodes: true, edges: true, peakWindows: true },
  });

  if (net === null) {
    return null;
  }

  return buildGraph(
    net.nodes.map((n) => ({
      key: n.key,
      x: n.x ?? undefined,
      y: n.y ?? undefined,
    })),
    net.edges.map((e) => ({
      fromKey: e.fromKey,
      toKey: e.toKey,
      cost: e.cost,
      maxWeight: e.maxWeight,
      noHazardous: e.noHazardous,
      trafficMultiplier: e.trafficMultiplier,
    })),
    {
      heuristicScale: net.heuristicScale,
      peakWindows: net.peakWindows.map((w) => ({
        startMinute: w.startMinute,
        endMinute: w.endMinute,
      })),
    },
  );
}

function makeDbSegmentResolver(
  networkId: string,
  graph: Graph,
  vehicle: RouteRequest['vehicleProfile'],
  peak: boolean,
  log: Logger,
): SegmentResolver {
  const heuristic =
    graph.heuristicScale != null
      ? scaledEuclideanHeuristic(graph.heuristicScale, graph.nodes)
      : zeroHeuristic;

  return async (fromKey, toKey) => {
    log.debug({ fromKey, toKey }, 'resolving leg');

    const where = {
      networkId_fromKey_toKey_vehicleWeight_hazardous_peak: {
        networkId,
        fromKey,
        toKey,
        vehicleWeight: vehicle.weight,
        hazardous: vehicle.hazardous,
        peak,
      },
    };

    const cached = await prisma.routeSegmentCache.findUnique({ where });
    if (cached) {
      const updated = await prisma.routeSegmentCache.update({
        where: { id: cached.id },
        data: { hitCount: { increment: 1 } },
      });
      log.debug(
        { fromKey, toKey, cost: cached.totalCost, hitCount: updated.hitCount },
        'segment cache hit',
      );
      return { path: cached.path, cost: cached.totalCost };
    }

    let expanded = 0;
    const seg = aStar(graph, fromKey, toKey, {
      vehicle,
      peak,
      heuristic,
      onExpand: () => {
        expanded += 1;
      },
    });
    if (seg === null) {
      log.debug({ fromKey, toKey, expanded }, 'segment has no route');
      return null;
    }

    await prisma.routeSegmentCache.upsert({
      where,
      create: {
        networkId,
        fromKey,
        toKey,
        vehicleWeight: vehicle.weight,
        hazardous: vehicle.hazardous,
        peak,
        totalCost: seg.cost,
        path: seg.path,
        hops: seg.path.length - 1,
      },
      update: {},
    });

    log.debug(
      { fromKey, toKey, cost: seg.cost, hops: seg.path.length - 1, expanded },
      'segment computed',
    );
    return seg;
  };
}

export async function runJob(jobId: string, injectedLog?: Logger): Promise<void> {
  const job = await getJob(jobId);
  if (job === null) {
    return;
  }
  if (job.status !== 'RUNNING') {
    return;
  }

  const startedAt = performance.now();
  const log = injectedLog ?? logger.child({ jobId });

  try {
    await appendLog(jobId, 'INFO', 'job started', { networkId: job.networkId });
    log.info({ networkId: job.networkId }, 'job started');

    const request = job.requestPayload as unknown as RouteRequest;
    const graph = await loadGraph(job.networkId);

    if (graph === null) {
      const durationMs = Math.round(performance.now() - startedAt);
      await appendLog(jobId, 'ERROR', 'network not found', { networkId: job.networkId });
      await markFailed(jobId, {
        errorCode: 'INVALID_NODE',
        errorMessage: `network not found: ${job.networkId}`,
        durationMs,
      });
      log.error('network not found');
      return;
    }

    const peak = isPeak(request.departureTime, graph.peakWindows);
    const resolver = makeDbSegmentResolver(job.networkId, graph, request.vehicleProfile, peak, log);
    log.debug({ peak, waypoints: request.waypoints ?? [] }, 'planning route');
    const outcome = await planRoute(graph, request, { segmentResolver: resolver });
    const durationMs = Math.round(performance.now() - startedAt);

    if (outcome.ok) {
      const responsePayload = {
        graphId: job.networkId,
        totalCost: outcome.result.totalCost,
        path: outcome.result.path,
        durationMs,
      };
      await appendLog(jobId, 'INFO', 'job completed', responsePayload);
      await markCompleted(jobId, { responsePayload, durationMs });
      log.info(responsePayload, 'job completed');
    } else {
      await appendLog(jobId, 'WARN', 'no route', outcome.error);
      await markFailed(jobId, {
        errorCode: outcome.error.code,
        errorMessage: outcome.error.message,
        durationMs,
      });
      log.warn(outcome.error, 'no route');
    }
  } catch (err) {
    const durationMs = Math.round(performance.now() - startedAt);
    const message = err instanceof Error ? err.message : String(err);
    await appendLog(jobId, 'ERROR', 'job crashed', { error: message });
    await markFailed(jobId, { errorCode: 'INTERNAL', errorMessage: message, durationMs });
    log.error({ err }, 'job crashed');
  }
}
