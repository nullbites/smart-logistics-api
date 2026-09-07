import { type FastifyInstance } from 'fastify';
import { buildApp } from '../../server/app';
import { prisma } from '../../db/client';

const README_EDGES = [
  { from: 'A', to: 'B', cost: 10, maxWeight: 10000, noHazardous: false, trafficMultiplier: 1.0 },
  { from: 'A', to: 'C', cost: 15, maxWeight: 5000, noHazardous: true, trafficMultiplier: 1.5 },
  { from: 'B', to: 'D', cost: 12, maxWeight: 10000, noHazardous: false, trafficMultiplier: 2.0 },
  { from: 'C', to: 'D', cost: 5, maxWeight: 5000, noHazardous: true, trafficMultiplier: 1.0 },
  { from: 'D', to: 'E', cost: 10, maxWeight: 8000, noHazardous: false, trafficMultiplier: 1.2 },
];

const README_NODES = [
  { key: 'A', x: 0, y: 0 },
  { key: 'B', x: 3, y: 0 },
  { key: 'C', x: 3, y: 4 },
  { key: 'D', x: 6, y: 4 },
  { key: 'E', x: 9, y: 4 },
];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

async function upload(app: FastifyInstance, body: unknown) {
  return app.inject({
    method: 'POST',
    url: '/network/upload',
    headers: { 'content-type': 'application/json' },
    payload: JSON.stringify(body),
  });
}

describe('network routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp({ logger: false });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('schema validation (passes now)', () => {
    it('rejects an empty edges array with 400', async () => {
      const res = await upload(app, { edges: [] });
      expect(res.statusCode).toBe(400);
    });

    it('rejects a missing edges array with 400', async () => {
      const res = await upload(app, { nodes: README_NODES });
      expect(res.statusCode).toBe(400);
    });

    it('rejects an unknown top-level property with 400', async () => {
      const res = await upload(app, { edges: README_EDGES, bogus: true });
      expect(res.statusCode).toBe(400);
    });

    it('rejects an out-of-range peak window time with 400', async () => {
      const res = await upload(app, {
        edges: README_EDGES,
        peakWindows: [{ start: '26:99', end: '09:00' }],
      });
      expect(res.statusCode).toBe(400);
    });

    it('rejects a non-zero-padded peak window time with 400', async () => {
      const res = await upload(app, {
        edges: README_EDGES,
        peakWindows: [{ start: '7:00', end: '09:00' }],
      });
      expect(res.statusCode).toBe(400);
    });

    it('rejects a non-uuid network id on GET /network/nodes with 400', async () => {
      const res = await app.inject({ method: 'GET', url: '/network/nodes/not-a-uuid' });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('handler behavior (fails until the service lands)', () => {
    it('creates a network from the README edges with default peak windows', async () => {
      const res = await upload(app, { edges: README_EDGES });
      expect(res.statusCode).toBe(201);

      const body = res.json() as { networkId: string };
      expect(body.networkId).toMatch(UUID_RE);

      const network = await prisma.network.findUnique({ where: { id: body.networkId } });
      expect(network).not.toBeNull();

      const nodes = await prisma.node.findMany({ where: { networkId: body.networkId } });
      expect(nodes.map((n) => n.key).sort()).toEqual(['A', 'B', 'C', 'D', 'E']);

      const edges = await prisma.edge.findMany({ where: { networkId: body.networkId } });
      expect(edges).toHaveLength(5);

      const windows = await prisma.networkPeakWindow.findMany({
        where: { networkId: body.networkId },
        orderBy: { startMinute: 'asc' },
      });
      expect(windows.map((w) => ({ startMinute: w.startMinute, endMinute: w.endMinute }))).toEqual([
        { startMinute: 420, endMinute: 540 },
        { startMinute: 1020, endMinute: 1140 },
      ]);
    });

    it('preserves an explicit wrapping peak window', async () => {
      const res = await upload(app, {
        edges: README_EDGES,
        peakWindows: [{ start: '22:00', end: '02:00' }],
      });
      expect(res.statusCode).toBe(201);

      const { networkId } = res.json() as { networkId: string };
      const windows = await prisma.networkPeakWindow.findMany({ where: { networkId } });
      expect(windows).toHaveLength(1);
      expect(windows[0]).toMatchObject({ startMinute: 1320, endMinute: 120 });
    });

    it('accepts an explicit empty peak window list', async () => {
      const res = await upload(app, { edges: README_EDGES, peakWindows: [] });
      expect(res.statusCode).toBe(201);

      const { networkId } = res.json() as { networkId: string };
      const windows = await prisma.networkPeakWindow.findMany({ where: { networkId } });
      expect(windows).toHaveLength(0);
    });

    it('stores node coordinates and a heuristic scale when nodes are supplied', async () => {
      const res = await upload(app, { edges: README_EDGES, nodes: README_NODES });
      expect(res.statusCode).toBe(201);

      const { networkId } = res.json() as { networkId: string };
      const nodes = await prisma.node.findMany({ where: { networkId } });
      expect(nodes.every((n) => typeof n.x === 'number' && typeof n.y === 'number')).toBe(true);

      const network = await prisma.network.findUnique({ where: { id: networkId } });
      expect(typeof network?.heuristicScale).toBe('number');
    });

    it('leaves the heuristic scale null when no nodes are supplied', async () => {
      const res = await upload(app, { edges: README_EDGES });
      expect(res.statusCode).toBe(201);

      const { networkId } = res.json() as { networkId: string };
      const network = await prisma.network.findUnique({ where: { id: networkId } });
      expect(network?.heuristicScale).toBeNull();
    });

    it('lists the nodes of an uploaded network', async () => {
      const uploadRes = await upload(app, { edges: README_EDGES, nodes: README_NODES });
      const { networkId } = uploadRes.json() as { networkId: string };

      const res = await app.inject({ method: 'GET', url: `/network/nodes/${networkId}` });
      expect(res.statusCode).toBe(200);

      const body = res.json() as {
        networkId: string;
        nodes: { key: string; x?: number; y?: number }[];
      };
      expect(body.networkId).toBe(networkId);
      expect(body.nodes.map((n) => n.key).sort()).toEqual(['A', 'B', 'C', 'D', 'E']);
      const nodeA = body.nodes.find((n) => n.key === 'A');
      expect(nodeA).toMatchObject({ x: 0, y: 0 });
    });

    it('returns a 404 envelope for an unknown network id', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/network/nodes/00000000-0000-0000-0000-000000000000',
      });
      expect(res.statusCode).toBe(404);

      const body = res.json() as { error: { code: string; message: string } };
      expect(body.error.code).toBe('NOT_FOUND');
    });
  });
});
