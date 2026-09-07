import { randomUUID } from 'node:crypto';
import pino from 'pino';
import * as astarModule from '../../algorithm/astar';
import { prisma } from '../../db/client';
import type { RouteRequest } from '../../domain/types';
import { createJob, getJob, markRunning } from '../job.service';
import { createNetwork, type CreateNetworkInput } from '../network.service';
import { loadGraph, runJob } from '../route.service';

type ResponsePayload = {
  graphId: string;
  totalCost: number;
  path: string[];
  durationMs: number;
};

async function uploadReadmeNetwork(overrides?: Partial<CreateNetworkInput>): Promise<string> {
  const { networkId } = await createNetwork({
    edges: [
      {
        from: 'A',
        to: 'B',
        cost: 10,
        maxWeight: 10000,
        noHazardous: false,
        trafficMultiplier: 1.0,
      },
      { from: 'A', to: 'C', cost: 15, maxWeight: 5000, noHazardous: true, trafficMultiplier: 1.5 },
      {
        from: 'B',
        to: 'D',
        cost: 12,
        maxWeight: 10000,
        noHazardous: false,
        trafficMultiplier: 2.0,
      },
      { from: 'C', to: 'D', cost: 5, maxWeight: 5000, noHazardous: true, trafficMultiplier: 1.0 },
      { from: 'D', to: 'E', cost: 10, maxWeight: 8000, noHazardous: false, trafficMultiplier: 1.2 },
    ],
    ...overrides,
  });
  return networkId;
}

function request(overrides: Partial<RouteRequest> = {}): RouteRequest {
  return {
    originNodeId: 'A',
    destinationNodeId: 'E',
    vehicleProfile: { type: 'van', weight: 3000, hazardous: false },
    departureTime: '12:00',
    ...overrides,
  };
}

async function runOne(networkId: string, req: RouteRequest) {
  const { id } = await createJob({ networkId, requestPayload: req });
  await markRunning(id);
  await runJob(id);
  return getJob(id);
}

describe('route.service', () => {
  describe('loadGraph', () => {
    it('builds a Graph from the persisted network', async () => {
      const networkId = await uploadReadmeNetwork();
      const graph = await loadGraph(networkId);
      if (graph === null) {
        throw new Error('expected a graph');
      }

      expect([...graph.nodes.keys()].sort()).toEqual(['A', 'B', 'C', 'D', 'E']);

      const fromA = graph.adjacency.get('A') ?? [];
      expect(fromA.map((e) => `${e.fromKey}->${e.toKey}`).sort()).toEqual(['A->B', 'A->C']);

      expect(graph.peakWindows).toEqual([
        { startMinute: 420, endMinute: 540 },
        { startMinute: 1020, endMinute: 1140 },
      ]);
      expect(graph.heuristicScale).toBeNull();
    });

    it('returns null for an unknown network id', async () => {
      expect(await loadGraph(randomUUID())).toBeNull();
    });
  });

  describe('runJob', () => {
    it('TC1: completes a light van A -> E off-peak', async () => {
      const networkId = await uploadReadmeNetwork();
      const job = await runOne(networkId, request());

      expect(job?.status).toBe('COMPLETED');
      expect(job?.responsePayload).toEqual({
        graphId: networkId,
        totalCost: 30,
        path: ['A', 'C', 'D', 'E'],
        durationMs: expect.any(Number),
      });
      const rp = job?.responsePayload as ResponsePayload;
      expect(rp.durationMs).toBeGreaterThanOrEqual(0);

      const logs = await prisma.jobLog.findMany({ where: { jobId: job?.id } });
      const messages = logs.map((l) => l.message);
      expect(messages).toContain('job started');
      expect(messages).toContain('job completed');
    });

    it('TC2: routes a heavy vehicle around the light-weight edges', async () => {
      const networkId = await uploadReadmeNetwork();
      const job = await runOne(
        networkId,
        request({ vehicleProfile: { type: 'van', weight: 6000, hazardous: false } }),
      );

      expect(job?.status).toBe('COMPLETED');
      const rp = job?.responsePayload as ResponsePayload;
      expect(rp.totalCost).toBe(32);
      expect(rp.path).toEqual(['A', 'B', 'D', 'E']);
    });

    it('TC3: routes a hazardous load around the barred edges', async () => {
      const networkId = await uploadReadmeNetwork();
      const job = await runOne(
        networkId,
        request({ vehicleProfile: { type: 'van', weight: 3000, hazardous: true } }),
      );

      expect(job?.status).toBe('COMPLETED');
      const rp = job?.responsePayload as ResponsePayload;
      expect(rp.totalCost).toBe(32);
      expect(rp.path).toEqual(['A', 'B', 'D', 'E']);
    });

    it('applies the peak multiplier for a departure inside a peak window', async () => {
      const networkId = await uploadReadmeNetwork();
      const job = await runOne(networkId, request({ departureTime: '08:00' }));

      expect(job?.status).toBe('COMPLETED');
      const rp = job?.responsePayload as ResponsePayload;
      expect(rp.totalCost).toBeCloseTo(39.5);
    });

    it('fails with NO_ROUTE when the destination is unreachable', async () => {
      const networkId = await uploadReadmeNetwork();
      const job = await runOne(networkId, request({ originNodeId: 'E', destinationNodeId: 'A' }));

      expect(job?.status).toBe('FAILED');
      expect(job?.errorCode).toBe('NO_ROUTE');
    });

    it('fails with INVALID_NODE for an unknown origin node', async () => {
      const networkId = await uploadReadmeNetwork();
      const job = await runOne(networkId, request({ originNodeId: 'X' }));

      expect(job?.status).toBe('FAILED');
      expect(job?.errorCode).toBe('INVALID_NODE');
    });
  });

  describe('segment cache', () => {
    it('writes a segment on the first run and reuses it on the second', async () => {
      const networkId = await uploadReadmeNetwork();

      await runOne(networkId, request());

      const first = await prisma.routeSegmentCache.findMany({ where: { networkId } });
      expect(first).toHaveLength(1);
      expect(first[0]).toMatchObject({
        fromKey: 'A',
        toKey: 'E',
        path: ['A', 'C', 'D', 'E'],
        totalCost: 30,
        hops: 3,
        hitCount: 0,
        vehicleWeight: 3000,
        hazardous: false,
        peak: false,
      });

      const spy = jest.spyOn(astarModule, 'aStar');
      try {
        await runOne(networkId, request());

        const second = await prisma.routeSegmentCache.findMany({ where: { networkId } });
        expect(second).toHaveLength(1);
        expect(second[0]?.hitCount).toBe(1);
        expect(spy).not.toHaveBeenCalled();
      } finally {
        spy.mockRestore();
      }
    });

    it('keeps distinct rows for distinct vehicle weights', async () => {
      const networkId = await uploadReadmeNetwork();

      await runOne(networkId, request());
      await runOne(
        networkId,
        request({ vehicleProfile: { type: 'van', weight: 6000, hazardous: false } }),
      );

      const rows = await prisma.routeSegmentCache.findMany({ where: { networkId } });
      expect(rows).toHaveLength(2);
      expect(rows.map((r) => r.vehicleWeight).sort((a, b) => a - b)).toEqual([3000, 6000]);
    });
  });

  describe('verbose step logging', () => {
    function captureLogger(): { logger: pino.Logger; lines: Array<Record<string, unknown>> } {
      const lines: Array<Record<string, unknown>> = [];
      const logger = pino(
        { level: 'debug' },
        {
          write(chunk: string) {
            lines.push(JSON.parse(chunk) as Record<string, unknown>);
          },
        },
      );
      return { logger, lines };
    }

    async function runWith(logger: pino.Logger, networkId: string, req: RouteRequest) {
      const { id } = await createJob({ networkId, requestPayload: req });
      await markRunning(id);
      await runJob(id, logger);
      return id;
    }

    it('emits debug lines for the plan, each leg, and the A* effort on a cache miss', async () => {
      const networkId = await uploadReadmeNetwork();
      const { logger, lines } = captureLogger();

      await runWith(logger, networkId, request());

      const messages = lines.map((l) => l.msg);
      expect(messages).toContain('planning route');
      expect(messages).toContain('resolving leg');
      expect(messages).toContain('segment computed');

      const computed = lines.find((l) => l.msg === 'segment computed');
      expect(typeof computed?.expanded).toBe('number');
      expect(computed?.expanded as number).toBeGreaterThan(0);
    });

    it('emits a cache-hit debug line on an identical second run', async () => {
      const networkId = await uploadReadmeNetwork();
      await runOne(networkId, request());

      const { logger, lines } = captureLogger();
      await runWith(logger, networkId, request());

      const hit = lines.find((l) => l.msg === 'segment cache hit');
      expect(hit).toBeDefined();
      expect(hit?.hitCount).toBe(1);
    });

    it('stays quiet at info level (no debug lines)', async () => {
      const networkId = await uploadReadmeNetwork();
      const lines: Array<Record<string, unknown>> = [];
      const logger = pino(
        { level: 'info' },
        {
          write(chunk: string) {
            lines.push(JSON.parse(chunk) as Record<string, unknown>);
          },
        },
      );

      await runWith(logger, networkId, request());

      expect(lines.some((l) => l.level === 20)).toBe(false);
      expect(lines.some((l) => l.msg === 'job completed')).toBe(true);
    });
  });
});
