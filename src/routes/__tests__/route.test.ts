import { type FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';
import { buildApp } from '../../server/app';
import { getJobQueue } from '../../worker/queue';
import { prisma } from '../../db/client';

const README_EDGES = [
  { from: 'A', to: 'B', cost: 10, maxWeight: 10000, noHazardous: false, trafficMultiplier: 1.0 },
  { from: 'A', to: 'C', cost: 15, maxWeight: 5000, noHazardous: true, trafficMultiplier: 1.5 },
  { from: 'B', to: 'D', cost: 12, maxWeight: 10000, noHazardous: false, trafficMultiplier: 2.0 },
  { from: 'C', to: 'D', cost: 5, maxWeight: 5000, noHazardous: true, trafficMultiplier: 1.0 },
  { from: 'D', to: 'E', cost: 10, maxWeight: 8000, noHazardous: false, trafficMultiplier: 1.2 },
];

interface StatusBody {
  status: string;
  result?: { graphId: string; totalCost: number; path: string[]; durationMs: number };
  error?: { code: string; message: string };
}

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

describe('route optimization routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp({ logger: false });
  });

  afterAll(async () => {
    await app.close();
  });

  async function uploadNetwork(overrides: Record<string, unknown> = {}): Promise<string> {
    const res = await app.inject({
      method: 'POST',
      url: '/network/upload',
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify({ edges: README_EDGES, ...overrides }),
    });
    expect(res.statusCode).toBe(201);
    return (res.json() as { networkId: string }).networkId;
  }

  function submit(networkId: string, body: unknown) {
    return app.inject({
      method: 'POST',
      url: `/route/optimize/${networkId}`,
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify(body),
    });
  }

  async function runToEnd(
    networkId: string,
    body: unknown,
  ): Promise<{ jobId: string; status: StatusBody }> {
    const res = await submit(networkId, body);
    expect(res.statusCode).toBe(202);
    const { jobId } = res.json() as { jobId: string };
    expect(jobId).toMatch(/^job-/);

    await getJobQueue().drain();

    const statusRes = await app.inject({ method: 'GET', url: `/route/status/${jobId}` });
    expect(statusRes.statusCode).toBe(200);
    return { jobId, status: statusRes.json() as StatusBody };
  }

  it('TC1 completes the off-peak van route via C', async () => {
    const networkId = await uploadNetwork();
    const { status } = await runToEnd(networkId, {
      originNodeId: 'A',
      destinationNodeId: 'E',
      vehicleProfile: { type: 'van', weight: 3000, hazardous: false },
      departureTime: '12:00',
    });

    expect(status.status).toBe('COMPLETED');
    expect(status.result?.graphId).toBe(networkId);
    expect(status.result?.totalCost).toBe(30);
    expect(status.result?.path).toEqual(['A', 'C', 'D', 'E']);
    expect(typeof status.result?.durationMs).toBe('number');
    expect(status.result?.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('TC2 routes a heavy vehicle via B', async () => {
    const networkId = await uploadNetwork();
    const { status } = await runToEnd(networkId, {
      originNodeId: 'A',
      destinationNodeId: 'E',
      vehicleProfile: { type: 'truck', weight: 6000, hazardous: false },
      departureTime: '12:00',
    });

    expect(status.status).toBe('COMPLETED');
    expect(status.result?.totalCost).toBe(32);
    expect(status.result?.path).toEqual(['A', 'B', 'D', 'E']);
  });

  it('TC3 routes a hazardous vehicle via B', async () => {
    const networkId = await uploadNetwork();
    const { status } = await runToEnd(networkId, {
      originNodeId: 'A',
      destinationNodeId: 'E',
      vehicleProfile: { type: 'van', weight: 3000, hazardous: true },
      departureTime: '12:00',
    });

    expect(status.status).toBe('COMPLETED');
    expect(status.result?.totalCost).toBe(32);
    expect(status.result?.path).toEqual(['A', 'B', 'D', 'E']);
  });

  it('honors a waypoint', async () => {
    const networkId = await uploadNetwork();
    const { status } = await runToEnd(networkId, {
      originNodeId: 'A',
      destinationNodeId: 'E',
      waypoints: ['B'],
      vehicleProfile: { type: 'van', weight: 3000, hazardous: false },
      departureTime: '12:00',
    });

    expect(status.status).toBe('COMPLETED');
    expect(status.result?.path).toEqual(['A', 'B', 'D', 'E']);
    expect(status.result?.totalCost).toBe(32);
  });

  it('applies peak traffic multipliers', async () => {
    const networkId = await uploadNetwork();
    const { status } = await runToEnd(networkId, {
      originNodeId: 'A',
      destinationNodeId: 'E',
      vehicleProfile: { type: 'van', weight: 3000, hazardous: false },
      departureTime: '08:00',
    });

    expect(status.status).toBe('COMPLETED');
    expect(status.result?.totalCost).toBeCloseTo(39.5);
  });

  it('reports NO_ROUTE for an unreachable destination', async () => {
    const networkId = await uploadNetwork();
    const { status } = await runToEnd(networkId, {
      originNodeId: 'E',
      destinationNodeId: 'A',
      vehicleProfile: { type: 'van', weight: 3000, hazardous: false },
      departureTime: '12:00',
    });

    expect(status.status).toBe('FAILED');
    expect(status.error?.code).toBe('NO_ROUTE');
    expect(typeof status.error?.message).toBe('string');
  });

  it('reports INVALID_NODE for an unknown origin', async () => {
    const networkId = await uploadNetwork();
    const { status } = await runToEnd(networkId, {
      originNodeId: 'X',
      destinationNodeId: 'E',
      vehicleProfile: { type: 'van', weight: 3000, hazardous: false },
      departureTime: '12:00',
    });

    expect(status.status).toBe('FAILED');
    expect(status.error?.code).toBe('INVALID_NODE');
    expect(typeof status.error?.message).toBe('string');
  });

  it('returns a 404 envelope for a submit against an unknown network', async () => {
    const res = await submit(randomUUID(), {
      originNodeId: 'A',
      destinationNodeId: 'E',
      vehicleProfile: { type: 'van', weight: 3000, hazardous: false },
      departureTime: '12:00',
    });

    expect(res.statusCode).toBe(404);
    const body = res.json() as { error: { code: string; message: string } };
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('rejects an out-of-range departure time with 400', async () => {
    const networkId = await uploadNetwork();
    const res = await submit(networkId, {
      originNodeId: 'A',
      destinationNodeId: 'E',
      vehicleProfile: { type: 'van', weight: 3000, hazardous: false },
      departureTime: '26:99',
    });
    expect(res.statusCode).toBe(400);
  });

  it('rejects an unknown top-level property with 400', async () => {
    const networkId = await uploadNetwork();
    const res = await submit(networkId, {
      originNodeId: 'A',
      destinationNodeId: 'E',
      vehicleProfile: { type: 'van', weight: 3000, hazardous: false },
      departureTime: '12:00',
      bogus: true,
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns a 404 envelope for an unknown job id', async () => {
    const res = await app.inject({ method: 'GET', url: '/route/status/job-does-not-exist' });
    expect(res.statusCode).toBe(404);
    const body = res.json() as { error: { code: string; message: string } };
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('indexes the audit row by the returned job id', async () => {
    const networkId = await uploadNetwork();
    const res = await submit(networkId, {
      originNodeId: 'A',
      destinationNodeId: 'E',
      vehicleProfile: { type: 'van', weight: 3000, hazardous: false },
      departureTime: '12:00',
    });
    expect(res.statusCode).toBe(202);
    const { jobId } = res.json() as { jobId: string };

    let row: { jobId: string | null } | undefined;
    for (let i = 0; i < 20 && row === undefined; i += 1) {
      const rows = await prisma.requestLog.findMany({
        where: { method: 'POST', path: { startsWith: '/route/optimize/' } },
      });
      row = rows.find((r) => r.jobId === jobId);
      if (row === undefined) {
        await delay(50);
      }
    }

    expect(row).toBeDefined();
    expect(row?.jobId).toBe(jobId);

    await getJobQueue().drain();
  });

  it('exposes a valid status shape before the job finishes', async () => {
    const networkId = await uploadNetwork();
    const res = await submit(networkId, {
      originNodeId: 'A',
      destinationNodeId: 'E',
      vehicleProfile: { type: 'van', weight: 3000, hazardous: false },
      departureTime: '12:00',
    });
    expect(res.statusCode).toBe(202);
    const { jobId } = res.json() as { jobId: string };

    const statusRes = await app.inject({ method: 'GET', url: `/route/status/${jobId}` });
    expect(statusRes.statusCode).toBe(200);
    expect(['PENDING', 'RUNNING', 'COMPLETED']).toContain((statusRes.json() as StatusBody).status);

    await getJobQueue().drain();
  });
});
